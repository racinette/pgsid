import {
  compositeGoInput,
  type CompositeInputPayload,
} from '../../tools/check-rust/composite-input.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'
import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import {
  arrayGoInput,
  type OwnedArrayInputCell,
  type OwnedArrayInputPayload,
} from '../../tools/check-rust/array-input.js'
import { tsqueryGoPayload, type TsqueryInputPayload } from '../../tools/check-rust/tsquery-input.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

it('validates owned tsquery arrays and record fields through native INSERTs and public Go and TypeScript inputs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-owned-')),
    run = promisify(execFile)
  const context = { serverEncoding: 'UTF8', defaultCollation: 'C', arrayNulls: true } as const
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const array = (
    elements: OwnedArrayInputCell[],
    dimensions = elements.length ? [{ lower: 1, length: elements.length }] : [],
  ): OwnedArrayInputPayload => ({
    elementType: 'pg_catalog.tsquery',
    elementKind: 48,
    elements,
    dimensions,
    nullBitmap: { kind: 'Value', value: elements.some((c) => c.kind === 'Null') },
  })
  const forms: Record<string, string> = {
    bundle_head: '(bundle).head IS NOT DISTINCT FROM needle',
    bundle_array: '(bundle).items IS NOT DISTINCT FROM items',
    bundle_json:
      "to_jsonb(bundle)=jsonb_build_object('head',to_jsonb(needle),'items',to_jsonb(items))",
    bundle_presence: 'bundle IS NULL',
    same: 'items=reference',
    less: 'items<reference',
    sorted: 'array_sort(items)=array_sort(reference)',
    located: 'array_position(items,needle)=1',
    json: 'to_jsonb(items)=to_jsonb(reference)',
    projected: '((ROW(needle,items)::owned_vector_bundle).items) IS NOT DISTINCT FROM items',
    joined: "array_to_string(items,'|','missing') IS NOT NULL",
    presence: 'items IS NULL',
    lazy: 'CASE WHEN bypass THEN true ELSE items=reference END',
  }
  try {
    await pg.exec('CREATE TYPE owned_vector_bundle AS(head tsquery,items tsquery[])')
    const columns =
      'items tsquery[],reference tsquery[],needle tsquery,bypass bool,bundle owned_vector_bundle'
    await pg.exec(
      `CREATE TABLE owned_vectors(${columns},${Object.entries(forms)
        .map(([n, s]) => `CONSTRAINT ${n} CHECK(${s})`)
        .join(',')})`,
    )
    for (const [n, s] of Object.entries(forms))
      await pg.exec(`CREATE TABLE owned_${n}(${columns},CONSTRAINT rule CHECK(${s}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'owned_vectors')!,
      bundleIdentity = catalog.compositeTypeGraph!.definitions.find(
        (t) => t.schema === 'public' && t.name === 'owned_vector_bundle',
      )!.identity
    const checks = Object.entries(forms).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source' ? { ...c, definition: `CHECK(${sql})` } : c,
            [],
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
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
    const a = (await readTsqueryFixture(pg, "SELECT 'a'::tsquery item", 'item'))!,
      z = (await readTsqueryFixture(pg, "SELECT 'z:A'::tsquery item", 'item'))!,
      grouped = (await readTsqueryFixture(pg, "SELECT 'a & (b & c)'::tsquery item", 'item'))!,
      flat = (await readTsqueryFixture(pg, "SELECT '(a & b) & c'::tsquery item", 'item'))!
    const cell = (value: TsqueryInputPayload): OwnedArrayInputCell => ({ kind: 'Tsquery', value })
    const samples = [
      { sql: "ARRAY['a'::tsquery,'z:A'::tsquery]", value: array([cell(a), cell(z)]) },
      { sql: "ARRAY['z:A'::tsquery,'a'::tsquery]", value: array([cell(z), cell(a)]) },
      { sql: "ARRAY['a'::tsquery,NULL::tsquery]", value: array([cell(a), { kind: 'Null' }]) },
      { sql: 'ARRAY[]::tsquery[]', value: array([]) },
      { sql: 'NULL::tsquery[]', value: null },
      {
        sql: "ARRAY[['a'::tsquery,'z:A'::tsquery]]",
        value: array(
          [cell(a), cell(z)],
          [
            { lower: 1, length: 1 },
            { lower: 1, length: 2 },
          ],
        ),
      },
      {
        sql: "array_fill('a'::tsquery,ARRAY[2],ARRAY[-3])",
        value: array([cell(a), cell(a)], [{ lower: -3, length: 2 }]),
      },
    ]
    samples.push({
      sql: "ARRAY['a & (b & c)'::tsquery,'(a & b) & c'::tsquery]",
      value: array([cell(grouped), cell(flat)]),
    })
    const reference = samples[0]!,
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      cases: { row: Row; expected: Record<string, Outcome> }[] = []
    let inserts = 0,
      rejections = 0
    for (const s of samples)
      for (const needle of [
        { sql: "'a'::tsquery", value: a },
        { sql: 'NULL::tsquery', value: null },
      ]) {
        const row: Row = {
            items: known(s.value),
            reference: known(reference.value),
            needle: known(needle.value),
            bypass: known(false),
            bundle: known({
              typeName: bundleIdentity,
              fields: [
                needle.value === null ? { kind: 'Null' } : cell(needle.value),
                s.value === null ? { kind: 'Null' } : { kind: 'Array', value: s.value },
              ],
            }),
          },
          expected: Record<string, Outcome> = {}
        for (const [name, sql] of Object.entries(forms)) {
          const source = `SELECT ${s.sql} items,${reference.sql} reference,${needle.sql} needle,false bypass,ROW(${needle.sql},${s.sql})::owned_vector_bundle bundle`
          let value: boolean | null = null,
            state: string | undefined
          try {
            value = (await pg.query<{ v: boolean | null }>(`SELECT ${sql} v FROM(${source}) q`))
              .rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          let failure: string | undefined
          try {
            await pg.exec(`INSERT INTO owned_${name} ${source}`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          inserts++
          if (failure) rejections++
          expected[name] = state
            ? { kind: 'Error', value: { state: parseInt(state, 36) } }
            : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
        }
        cases.push({ row, expected })
      }
    const base = cases[0]!,
      missing = array([cell({ ...a, nativeBytes: -1 }), cell(z)])
    const missingExpected = { ...base.expected }
    for (const name of ['same', 'less', 'sorted', 'located', 'projected', 'lazy', 'bundle_array'])
      missingExpected[name] = { kind: 'Unknown' }
    const partial = { row: { ...base.row, items: known(missing) }, expected: missingExpected }
    cases.push(partial)
    for (const [name, expected] of Object.entries(partial.expected))
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: partial.row, expected })
    const lazy = {
      row: { ...partial.row, bypass: known(true) },
      expected: { ...partial.expected, lazy: { kind: 'True' } as Outcome },
    }
    cases.push(lazy)
    for (const [name, expected] of Object.entries(lazy.expected))
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: lazy.row, expected })
    await runCheckParity(
      root,
      'tsqueryowned',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    const result = (o: Outcome) =>
      o.kind === 'Unknown'
        ? { certain: false }
        : o.kind === 'Error'
          ? { certain: true, error: o.value.state.toString(36).toUpperCase().padStart(5, '0') }
          : { certain: true, value: o.kind === 'Null' ? null : o.kind === 'True' }
    const tsBundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [], {
        executionContext: context,
        compositeTypeGraph: catalog.compositeTypeGraph,
        rangeTypes: catalog.rangeTypes,
      }),
      tsRoot = join(root, 'public-ts')
    await mkdir(tsRoot)
    await writeFile(join(tsRoot, 'package.json'), '{"type":"module"}')
    await writeFile(join(tsRoot, 'checks.ts'), tsBundle.checks)
    for (const a of checkTypescriptArtifacts(tsBundle.rustFiles!)) {
      const path = join(tsRoot, 'checks-rust', a.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, a.content)
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
    const evaluate = (row: unknown): Record<string, unknown> =>
      Object.fromEntries(
        api
          .evaluatePublicOwnedVectorsChecks(row)
          .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
      )
    const publicRow = (row: Row) => ({
      ...row,
      bypass: row.bypass?.kind === 'Value' ? row.bypass.value : undefined,
    })
    for (const c of cases)
      expect(evaluate(publicRow(c.row))).toEqual(
        Object.fromEntries(Object.entries(c.expected).map(([n, o]) => [n, result(o)])),
      )
    const badPayloads: unknown[] = [
      { ...a, nativeBytes: -2 },
      { ...a, root: 999 },
      { ...a, nodes: [{ ...a.nodes[0]!, text: '\ud800' }] },
      { ...a, nodes: [{ ...a.nodes[0]!, text: 'a\0' }] },
      { ...a, nodes: [{ ...a.nodes[0]!, weight: 16 }] },
      { ...a, nodes: [{ ...a.nodes[0]!, kind: 99 }] },
    ]
    for (const bad of badPayloads) {
      const input = {
        ...publicRow(base.row),
        items: {
          kind: 'Value',
          value: { ...reference.value, elements: [{ kind: 'Tsquery', value: bad }, cell(z)] },
        },
      }
      expect(evaluate(input).same).toEqual({ certain: false })
      expect(evaluate(input).presence).toEqual({ certain: false })
    }
    const goRoot = join(root, 'public-go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString(
          'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    checks:\n      serverEncoding: UTF8\n      defaultCollation: C\n      arrayNulls: true\n',
        ),
        undefined,
        'tsquery-owned',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module tsquery-owned\n\ngo 1.25\n')
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
    const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
    const rows = cases.map((c) =>
      go.composite(
        go.ident('PublicOwnedVectorsCheckInput'),
        Object.entries(c.row).map(([name, input]) => {
          let value
          if (name === 'bypass')
            value = go.call(go.ident('ptr'), [
              go.ident(input.kind === 'Value' ? String(input.value) : 'false'),
            ])
          else if (input.kind === 'Null')
            value = go.call(runtime(name === 'needle' ? 'TsqueryNull' : 'ArrayNull'), [])
          else if (name === 'bundle' && input.kind === 'Value')
            value = compositeGoInput(input.value as CompositeInputPayload)
          else if (input.kind === 'Value')
            value =
              name === 'needle'
                ? go.call(runtime('MakeTsqueryValue'), [
                    tsqueryGoPayload(input.value as TsqueryInputPayload),
                  ])
                : arrayGoInput(input.value as OwnedArrayInputPayload)
          else throw new Error('Unsupported public case')
          return go.keyValue(
            name[0]!.toUpperCase() + name.slice(1),
            go.call(go.ident('KnownCheckValue'), [value]),
          )
        }),
      ),
    )
    const rowSource = printGoFile({
      package: 'checks',
      imports: [{ path: 'tsquery-owned/checkrust/checkruntime' }],
      declarations: [
        go.function(
          'getOwnedRows',
          [],
          [{ type: go.slice(go.ident('PublicOwnedVectorsCheckInput')) }],
          [go.return(go.composite(go.slice(go.ident('PublicOwnedVectorsCheckInput')), rows))],
        ),
      ],
    })
    await writeFile(join(goRoot, 'rows_test.go'), rowSource)
    const assertions = cases.flatMap((c, i) =>
      Object.entries(c.expected).map(
        ([name, o]) =>
          `if r:=results[${i}]["${name}"]; ${o.kind === 'Unknown' ? 'r.Certain' : o.kind === 'Error' ? `!r.Certain||r.Value.Error!="${o.value.state.toString(36).toUpperCase().padStart(5, '0')}"` : o.kind === 'Null' ? '!r.Certain||r.Value.Valid' : `!r.Certain||!r.Value.Valid||r.Value.Value!=${o.kind === 'True'}`}{t.Fatalf("${i} ${name}: %+v",r)}`,
      ),
    )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "tsquery-owned/checkrust/checkruntime")
func ptr(v bool)*bool{return &v}
func TestOwned(t *testing.T){ownedRows:=getOwnedRows();results:=[]map[string]EvalBool{};for _,row:=range ownedRows{values:=map[string]EvalBool{};for _,c:=range EvaluatePublicOwnedVectorsChecks(row){values[c.Constraint]=c.Result};results=append(results,values)}
${assertions.join('\n')}
for _,badKind:=range []int{0,1,2}{row:=ownedRows[0];bad:=row.Items.V;bad.Value.Elements=append([]checkruntime.ArrayElement(nil),bad.Value.Elements...);payload:=bad.Value.Elements[0].Tsquery;payload.Nodes=append([]checkruntime.TsqueryNode(nil),payload.Nodes...);if badKind==0{payload.NativeBytes=-2};if badKind==1{payload.Nodes[0].Text="a\\x00"};if badKind==2{payload.Root=999};bad.Value.Elements[0].Tsquery=payload;row.Items=KnownCheckValue(bad);for _,c:=range EvaluatePublicOwnedVectorsChecks(row){if(c.Constraint=="same"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed tsquery cell accepted",badKind,c)}}}}
`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    await mkdir('artifacts/goal-checks/tsquery-containers-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/tsquery-containers-active/owned-reference.json',
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          publicRowsPerTarget: cases.length,
          malformedTypeScriptRows: badPayloads.length,
          malformedGoRows: 3,
        },
        null,
        2,
      ) + '\n',
    )
    console.log(
      `owned tsquery containers: ${inserts} native INSERTs, ${fixtures.length} parity fixtures, ${cases.length} public rows per target`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
