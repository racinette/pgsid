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

it('validates SQL-coerced tsvector payloads, domains and optional stored size through native, Rust and public Go and TypeScript validators', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-payload-')),
    packet = 'artifacts/goal-checks/tsvector-scalar-active',
    run = promisify(execFile)
  const context = { serverEncoding: 'UTF8', defaultCollation: 'C' } as const
  const definitions: Record<string, string> = {
    same: 'item=reference',
    less: 'item<reference',
    greater: 'item>reference',
    length: 'length(item)<=2',
    presence: 'item IS NULL',
    selected: '(CASE WHEN choose_first THEN item ELSE reference END)=reference',
    coalesced: 'COALESCE(NULL::tsvector,item,reference)=reference',
    distinctness: 'item IS DISTINCT FROM reference',
    nulled: 'NULLIF(item,reference) IS NULL',
    domain_value: '(item::nested_vector)=reference',
    stripped: 'strip(item)=strip(reference)',
    weighted: "setweight(item,'B')::text=setweight(reference,'B')::text",
    rendered: 'item::text=reference::text',
    lexemes: 'cardinality(tsvector_to_array(item))<=2',
    lazy: 'CASE WHEN bypass THEN true ELSE item=reference END',
    null_literal: 'NULL::tsvector IS NULL',
  }
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      'CREATE DOMAIN imported_vector AS tsvector;CREATE DOMAIN nested_vector AS imported_vector',
    )
    const columns = 'item nested_vector,reference tsvector,choose_first bool,bypass bool'
    await pg.exec(
      `CREATE TABLE vector_rows(${columns},${Object.entries(definitions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(`CREATE TABLE payload_${name}(${columns},CONSTRAINT rule CHECK(${sql}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'vector_rows')!
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
      const rows = (
        await pg.query<{ lexeme: string; positions: number[] | null; weights: string[] | null }>(
          'SELECT * FROM unnest($1::tsvector)',
          [text],
        )
      ).rows
      const nativeBytes = (
        await pg.query<{ bytes: number }>(
          "SELECT pg_column_size(setweight($1::tsvector,'D',ARRAY[]::text[])) bytes",
          [text],
        )
      ).rows[0]!.bytes
      const result = known({
        lexemes: rows.map((l) => ({
          text: l.lexeme,
          positions: (l.positions ?? []).map((position, i) => ({
            position,
            weight: 3 - 'ABCD'.indexOf(l.weights![i]!),
          })),
        })),
        nativeBytes,
      })
      payloads.set(text, result)
      return result
    }
    let inserts = 0,
      rejections = 0
    const samples = [null, '', 'a', 'b:2C a:1A', 'a:1,3B z:2', '😀:2 é:1', "'it''s':1A"]
    for (let i = 0; i < samples.length; i++)
      for (let variant = 0; variant < 4; variant++) {
        const source = samples[i]!,
          reference = variant === 0 ? source : variant === 1 ? null : 'a:1',
          choose = variant % 2 === 0,
          bypass = variant === 3
        const values = [source, reference, choose, bypass],
          query =
            'SELECT $1::nested_vector item,$2::tsvector reference,$3::bool choose_first,$4::bool bypass'
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
      !('lexemes' in complete.value)
    )
      throw new Error('Missing owned vector witness')
    const row = { ...base, item: known({ ...complete.value, nativeBytes: -1 }) },
      expected = { ...publicCases[12]!.expected }
    for (const name of [
      'same',
      'less',
      'greater',
      'selected',
      'coalesced',
      'distinctness',
      'nulled',
      'domain_value',
      'lazy',
    ])
      expected[name] = { kind: 'Unknown' }
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
      'tsvectorpayload',
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
          .evaluatePublicVectorRowsChecks(
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
    for (const bad of [
      undefined,
      'a:1',
      3,
      {},
      { kind: 'Value', value: null },
      ...[NaN, 1.5, '8', -2, 1073741824].map((nativeBytes) => ({
        kind: 'Value',
        value: { ...good, nativeBytes },
      })),
      { kind: 'Value', value: { ...good, lexemes: [{ text: '\ud800', positions: [] }] } },
      { kind: 'Value', value: { ...good, lexemes: [{ text: 'a\0', positions: [] }] } },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 0, weight: 3 }] }] },
      },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 1, weight: 4 }] }] },
      },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 1.5, weight: 3 }] }] },
      },
      {
        kind: 'Value',
        value: {
          ...good,
          lexemes: [
            { text: 'z', positions: [] },
            { text: 'a', positions: [] },
          ],
        },
      },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
    ]) {
      expect(evaluate({ ...base, item: bad }).same).toEqual({ certain: false })
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
          'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    checks:\n      serverEncoding: UTF8\n      defaultCollation: C\n',
        ),
        undefined,
        'tsvector-public',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module tsvector-public\n\ngo 1.25\n')
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
      const vector = name === 'item' || name === 'reference',
        type = vector ? 'checkruntime.TsvectorValue' : '*bool'
      if (input.kind === 'Null') return `NullCheckValue[${type}]()`
      if (input.kind === 'Unknown') return `CheckOptional[${type}] {}`
      if (input.kind === 'Error')
        return `KnownCheckValue(checkruntime.TsvectorValue{Kind:checkruntime.TsvectorValueError,Error:checkruntime.SqlError{State:${input.value.state}}})`

      if (typeof input.value === 'object' && 'lexemes' in input.value) {
        const v = input.value
        const lexemes = v.lexemes
          .map((l) => {
            const positions = l.positions
              .map((p) => '{Position:' + p.position + ',Weight:' + p.weight + '}')
              .join(',')
            return (
              '{Text:' +
              JSON.stringify(l.text) +
              ',Positions:[]checkruntime.TsvectorPosition{' +
              positions +
              '}}'
            )
          })
          .join(',')
        return (
          'KnownCheckValue(checkruntime.MakeTsvectorValue(checkruntime.TsvectorPayload{NativeBytes:' +
          v.nativeBytes +
          ',Lexemes:[]checkruntime.TsvectorLexeme{' +
          lexemes +
          '}}))'
        )
      }
      return `KnownCheckValue(ptr(${type.slice(1)}(${input.value})))`
    }
    const goRows = publicCases.map(
      (c) =>
        'PublicVectorRowsCheckInput{' +
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
import("testing";checkruntime "tsvector-public/checkrust/checkruntime")
func ptr[T any](value T)*T{return &value}
func TestPayloads(t *testing.T){rows:=[]PublicVectorRowsCheckInput{${goRows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range EvaluatePublicVectorRowsChecks(row){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}

base:=rows[12];for _,v:=range []checkruntime.TsvectorValue{
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:-2}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:1073741824}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:string([]byte{255})}}}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:"a",Positions:[]checkruntime.TsvectorPosition{{Position:0,Weight:3}}}}}},
 {Kind:checkruntime.TsvectorValueKind(99)},
}{base.Item=KnownCheckValue(v);for _,c:=range EvaluatePublicVectorRowsChecks(base){if (c.Constraint=="same"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed vector became certain",c)}}}

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
      `tsvector payloads: ${inserts} native INSERTs, ${fixtures.length} parity fixtures and ${publicCases.length} public rows per target`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
