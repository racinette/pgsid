import { readTsqueryFixture } from './check-tsquery-fixtures.js'
import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('validates SQL-coerced tsquery payloads, domains and optional stored size through native, Rust and public Go and TypeScript validators', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-payload-')),
    packet = 'artifacts/goal-checks/tsquery-scalar-active',
    run = promisify(execFile)
  const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const
  const definitions: Record<string, string> = {
    rendered: 'item::text=reference::text',
    wire: 'tsquerysend(item)=tsquerysend(reference)',
    count: 'numnode(item)<=3',
    presence: 'item IS NULL',
    selected: '(CASE WHEN choose_first THEN item ELSE reference END)::text=reference::text',
    coalesced: 'COALESCE(NULL::tsquery,item,reference)::text=reference::text',
    domain_value: '(item::nested_query)::text=reference::text',
    lazy: 'CASE WHEN bypass THEN true ELSE item::text=reference::text END',
    null_literal: 'NULL::tsquery IS NULL',
  }
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      'CREATE DOMAIN imported_query AS tsquery;CREATE DOMAIN nested_query AS imported_query',
    )

    const querySql = (parameter: string) => `${parameter}::tsquery`
    const columns = 'item nested_query,reference tsquery,choose_first bool,bypass bool'
    await pg.exec(
      `CREATE TABLE query_rows(${columns},${Object.entries(definitions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(`CREATE TABLE payload_${name}(${columns},CONSTRAINT rule CHECK(${sql}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'query_rows')!
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return (['raw', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'raw' ? { ...c, definition: `CHECK(${sql})` } : c,
            [],
            catalog.domains,
            origin === 'raw' ? 'source' : 'stored',
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      publicCases: { row: Row; expected: Record<string, Outcome> }[] = []
    const payloads = new Map<string, Input>()
    const capture = async (text: string | null): Promise<Input> => {
      if (text === null) return known(null)
      const cached = payloads.get(text)
      if (cached) return cached
      const value = await readTsqueryFixture(pg, `SELECT ${querySql('$1')} item`, 'item', [text])
      if (!value) throw Error('Missing query fixture')
      const result = known(value)
      payloads.set(text, result)
      return result
    }
    let inserts = 0,
      rejections = 0
    const samples = [
      null,
      '',
      'a',
      'a & b',
      'a & (b & c)',
      '(a & b) & c',
      'a <2> (b <3> c)',
      '😀 | é',
      "'it''s':*AB",
      '!a | b:*CD',
    ]
    for (let i = 0; i < samples.length; i++)
      for (let variant = 0; variant < 4; variant++) {
        const source = samples[i]!,
          reference = variant === 0 ? source : variant === 1 ? null : 'a',
          choose = variant % 2 === 0,
          bypass = variant === 3
        const values = [source, reference, choose, bypass],
          query = `SELECT (${querySql('$1')})::nested_query item,${querySql('$2')} reference,$3::bool choose_first,$4::bool bypass`
        const native = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${Object.entries(definitions)
              .map(([name, sql]) => `(${sql}) AS ${name}`)
              .join(',')} FROM (${query}) input`,
            values,
          )
        ).rows[0]!
        const row: Row = {
            item: await capture(source),
            reference: await capture(reference),
            choose_first: known(choose),
            bypass: known(bypass),
          },
          expected: Record<string, Outcome> = {}
        for (const [name, value] of Object.entries(native)) {
          expected[name] = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO payload_${name} ${query}`, values)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(value === false ? '23514' : undefined)
          inserts++
          if (failure) rejections++
          for (const origin of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
        }
        publicCases.push({ row, expected })
      }
    const base = publicCases[12]!.row
    for (const item of [
      { kind: 'Unknown' } as Input,
      { kind: 'Error', value: { state: parseInt('22003', 36) } } as Input,
    ]) {
      const row = { ...base, item },
        expected: Record<string, Outcome> = {}
      for (const name of Object.keys(definitions)) {
        expected[name] =
          name === 'null_literal'
            ? { kind: 'True' }
            : item.kind === 'Error'
              ? item
              : { kind: 'Unknown' }
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
      }
      publicCases.push({ row, expected })
    }
    const complete = base.item!
    if (
      complete.kind !== 'Value' ||
      typeof complete.value !== 'object' ||
      !('nodes' in complete.value)
    )
      throw new Error('Missing owned query witness')
    const row = { ...base, item: known({ ...complete.value, nativeBytes: -1 }) },
      expected = { ...publicCases[12]!.expected }
    for (const name of Object.keys(definitions))
      for (const origin of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
    publicCases.push({ row, expected })
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'payload-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          publicRows: publicCases.length,
        },
        null,
        2,
      ) + '\n',
    )
    await mkdir(join(root, 'parity'))
    await runCheckParity(
      join(root, 'parity'),
      'tsquerypayload',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    const tsBundle = renderTypescriptSchemaCheckArtifacts(
        [table],
        catalog.domains,
        catalog.domains,
        { executionContext: context },
      ),
      tsRoot = join(root, 'public-ts')
    await mkdir(tsRoot)
    await writeFile(join(tsRoot, 'package.json'), '{"type":"module"}')
    await writeFile(join(tsRoot, 'checks.ts'), tsBundle.checks)
    for (const artifact of checkTypescriptArtifacts(tsBundle.rustFiles!)) {
      const path = join(tsRoot, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node', [
      'node_modules/typescript/bin/tsc',
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(tsRoot, 'js'),
      join(tsRoot, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr)
    })
    const api = await import(pathToFileURL(join(tsRoot, 'js/checks.js')).href)
    const result = (outcome: Outcome) =>
      outcome.kind === 'Unknown'
        ? { certain: false }
        : outcome.kind === 'Error'
          ? { certain: true, error: outcome.value.state.toString(36).toUpperCase() }
          : { certain: true, value: outcome.kind === 'Null' ? null : outcome.kind === 'True' }
    const evaluate = (row: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(
        api
          .evaluatePublicQueryRowsChecks(
            Object.fromEntries(
              Object.entries(row).map(([name, value]) => [
                name,
                name === 'item' || name === 'reference'
                  ? value
                  : value && typeof value === 'object' && 'kind' in value
                    ? value.kind === 'Null'
                      ? null
                      : value.kind === 'Value' && 'value' in value
                        ? value.value
                        : undefined
                    : value,
              ]),
            ),
          )
          .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
      )
    for (const c of publicCases)
      expect(evaluate(c.row)).toEqual(
        Object.fromEntries(
          Object.entries(c.expected).map(([name, outcome]) => [name, result(outcome)]),
        ),
      )

    const good = complete.value
    const saved = structuredClone(good)
    evaluate(base)
    expect(good).toEqual(saved)
    const malformed: unknown[] = [
      undefined,
      'a',
      3,
      {},
      { kind: 'Value', value: null },
      ...[NaN, 1.5, '8', -2, 1073741824].map((nativeBytes) => ({
        kind: 'Value',
        value: { ...good, nativeBytes },
      })),
      ...[NaN, 1.5, '0', -1, good.nodes.length].map((root) => ({
        kind: 'Value',
        value: { ...good, root },
      })),
      { kind: 'Value', value: { ...good, nodes: null } },
      ...['\ud800', 'a\0'].map((text) => ({
        kind: 'Value',
        value: {
          nodes: [{ kind: 0, text, weight: 0, prefix: false, distance: 0, left: 0, right: 0 }],
          root: 0,
          nativeBytes: -1,
        },
      })),
      {
        kind: 'Value',
        value: {
          nodes: [
            { kind: 0, text: 'a', weight: 16, prefix: false, distance: 0, left: 0, right: 0 },
          ],
          root: 0,
          nativeBytes: -1,
        },
      },
      {
        kind: 'Value',
        value: {
          nodes: [{ kind: 1, text: '', weight: 0, prefix: false, distance: 0, left: 0, right: 0 }],
          root: 0,
          nativeBytes: -1,
        },
      },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
    ]
    for (const bad of malformed) {
      expect(evaluate({ ...base, item: bad }).rendered).toEqual({ certain: false })
      expect(evaluate({ ...base, item: bad }).presence).toEqual({ certain: false })
    }
    const goRoot = join(root, 'public-go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString(
          'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    checks:\n      serverEncoding: UTF8\n      clientEncoding: UTF8\n      defaultCollation: C\n',
        ),
        undefined,
        'tsquery-public',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module tsquery-public\n\ngo 1.25\n')
    await writeFile(join(goRoot, 'checks.go'), goBundle.checks)
    for (const [name, source] of Object.entries(goBundle.rustFiles!)) {
      if (!source) continue
      const path = join(
        goRoot,
        'checkrust',
        name === 'checks'
          ? 'checks.go'
          : name === 'runtime'
            ? 'checkruntime/runtime.go'
            : name === 'language'
              ? 'langruntime/runtime.go'
              : name === 'regex'
                ? 'regexengine/regex.go'
                : 'pg_catalog/operations.go',
      )
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, source)
    }
    const goInput = (name: string, input: Input): string => {
      const query = name === 'item' || name === 'reference',
        type = query ? 'checkruntime.TsqueryValue' : '*bool'
      if (input.kind === 'Null') return `NullCheckValue[${type}]()`
      if (input.kind === 'Unknown') return `CheckOptional[${type}] {}`
      if (input.kind === 'Error')
        return `KnownCheckValue(checkruntime.TsqueryValue{Kind:checkruntime.TsqueryValueError,Error:checkruntime.SqlError{State:${input.value.state}}})`

      if (typeof input.value === 'object' && 'nodes' in input.value) {
        const v = input.value
        return `KnownCheckValue(checkruntime.MakeTsqueryValue(checkruntime.TsqueryPayload{NativeBytes:${v.nativeBytes},Root:${v.root},Nodes:[]checkruntime.TsqueryNode{${v.nodes.map((n) => `{Kind:${n.kind},Text:${JSON.stringify(n.text)},Weight:${n.weight},Prefix:${n.prefix},Distance:${n.distance},Left:${n.left},Right:${n.right}}`).join(',')}}}))`
      }
      return `KnownCheckValue(ptr(${type.slice(1)}(${input.value})))`
    }
    const goRows = publicCases.map(
      (c) =>
        'PublicQueryRowsCheckInput{' +
        Object.entries(c.row)
          .map(
            ([name, input]) =>
              name
                .split('_')
                .map((p) => p[0]!.toUpperCase() + p.slice(1))
                .join('') +
              ':' +
              goInput(name, input),
          )
          .join(',') +
        '}',
    )
    const assertions = publicCases.flatMap((c, i) =>
      Object.entries(c.expected).map(
        ([name, outcome]) =>
          `if r:=results[${i}][${JSON.stringify(name)}]; ${outcome.kind === 'Unknown' ? 'r.Certain' : outcome.kind === 'Error' ? `!r.Certain || r.Value.Error != "${outcome.value.state.toString(36).toUpperCase()}"` : outcome.kind === 'Null' ? '!r.Certain || r.Value.Valid' : `!r.Certain || !r.Value.Valid || r.Value.Value != ${outcome.kind === 'True'}`} {t.Fatalf("${i} ${name}: %+v",r)}`,
      ),
    )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "tsquery-public/checkrust/checkruntime")
func ptr[T any](value T)*T{return &value}
func TestPayloads(t *testing.T){rows:=[]PublicQueryRowsCheckInput{${goRows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range EvaluatePublicQueryRowsChecks(row){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}

base:=rows[12];for _,v:=range []checkruntime.TsqueryValue{
 {Kind:checkruntime.TsqueryValueValue,Value:checkruntime.TsqueryPayload{NativeBytes:-2}},
 {Kind:checkruntime.TsqueryValueValue,Value:checkruntime.TsqueryPayload{NativeBytes:1073741824}},
 {Kind:checkruntime.TsqueryValueValue,Value:checkruntime.TsqueryPayload{NativeBytes:-1,Nodes:[]checkruntime.TsqueryNode{{Text:string([]byte{255})}}}},
 {Kind:checkruntime.TsqueryValueValue,Value:checkruntime.TsqueryPayload{NativeBytes:-1,Nodes:[]checkruntime.TsqueryNode{{Text:"a",Weight:16}}}},
 {Kind:checkruntime.TsqueryValueValue,Value:checkruntime.TsqueryPayload{NativeBytes:-1,Nodes:[]checkruntime.TsqueryNode{{Kind:1}}}},
 {Kind:checkruntime.TsqueryValueKind(99)},
}{base.Item=KnownCheckValue(v);for _,c:=range EvaluatePublicQueryRowsChecks(base){if (c.Constraint=="rendered"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed query became certain",c)}}}


}`,
    )
    await writeFile(
      join(packet, 'public-go-test.go'),
      await readFile(join(goRoot, 'checks_test.go'), 'utf8'),
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    console.log(
      `tsquery payloads: ${inserts} native INSERTs, ${fixtures.length} parity fixtures and ${publicCases.length} public rows per target`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
