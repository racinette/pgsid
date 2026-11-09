import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import {
  rangeGoInput,
  rangeTypescriptInput,
  type RangeInputPayload,
} from '../../tools/check-rust/range-input.js'
import {
  multirangeGoInput,
  multirangeTypescriptInput,
} from '../../tools/check-rust/multirange-input.js'
import {
  arrayGoInput,
  arrayTypescriptInput,
  type OwnedArrayInputPayload,
} from '../../tools/check-rust/array-input.js'
import { serverCheckResults } from '../support/check-server-results.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { internalCheckRows } from '../support/check-entries.js'

it('injects compiled nested range contexts before public ownership validation without retaining deployment enum OIDs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nested-range-payload-')),
    run = promisify(execFile)
  try {
    const schema = `CREATE TYPE public.stage_label AS ENUM('z','a');ALTER TYPE public.stage_label ADD VALUE 'mid' BEFORE 'a';
      CREATE TYPE public.stage_leaf AS RANGE(subtype=public.stage_label);
      CREATE TYPE public.stage_span AS RANGE(subtype=public.stage_leaf,multirange_type_name=stage_set);
      CREATE DOMAIN public.stage_history AS public.stage_span[];
      CREATE TABLE array_payloads(v stage_span,w stage_span,m stage_set,items stage_span[],nested stage_history[],bypass bool,
        CONSTRAINT ordered CHECK(CASE WHEN bypass THEN true ELSE v<w END),
        CONSTRAINT contained CHECK(CASE WHEN bypass THEN true ELSE m @> v END),
        CONSTRAINT position CHECK(CASE WHEN bypass THEN true ELSE array_position(items,v)=-2 END),
        CONSTRAINT nested_order CHECK(CASE WHEN bypass THEN true ELSE array_sort(nested)=nested END),
        CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE v::text='["[z,mid]","[mid,a]"]' END),
        CONSTRAINT hash_range CHECK(CASE WHEN bypass THEN true ELSE hash_range(v) IS NOT NULL END),
        CONSTRAINT hash_multirange CHECK(CASE WHEN bypass THEN true ELSE hash_multirange(m) IS NOT NULL END),
        CONSTRAINT hash_items CHECK(CASE WHEN bypass THEN true ELSE hash_array(items) IS NOT NULL END),
        CONSTRAINT hash_nested CHECK(CASE WHEN bypass THEN true ELSE hash_array(nested) IS NOT NULL END));`
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg),
      p = customRangeProfiles(catalog).find((profile) => profile.name === 'stage_span')!,
      context = { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const }
    const options = {
      enums: catalog.enums,
      rangeTypes: catalog.rangeTypes,
      executionContext: context,
    }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      options,
    )
    const shifted = await PGlite.create()
    try {
      await shifted.exec('CREATE TABLE discarded(v text);DROP TABLE discarded;' + schema)
      const other = await snapshotCatalog(shifted)
      expect(other.enums[0]!.valueOids).not.toEqual(catalog.enums[0]!.valueOids)
      const wire = async (database: PGlite) =>
        (
          await database.query<{ value: string }>(
            `SELECT encode(range_send('["[z,mid]","[mid,a]"]'::stage_span),'hex') value`,
          )
        ).rows[0]!.value
      expect(await wire(shifted)).toBe(await wire(pg))
      expect(
        renderTypescriptSchemaCheckArtifacts(other.tables, other.domains, other.domains, {
          enums: other.enums,
          rangeTypes: other.rangeTypes,
          executionContext: context,
        }),
      ).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const generatedGo = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'arraypublic/schema',
    )
    expect(generatedGo.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of [
      ...checkTypescriptArtifacts(ts.rustFiles!).map((a) => ({
        ...a,
        path: join(root, 'checks-rust', a.path),
      })),
      ...generatedGo.artifacts,
    ]) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
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
      join(root, 'js'),
      join(root, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const first = '["[z,mid]","[mid,a]"]',
      last = '["[mid,a]",)',
      multi = `{${first},${last}}`,
      array = rangeArrayText([first, null, last], -2)
    const v = (await readRangeFixture(pg, `SELECT $1::${p.identity} span`, 'span', p.rangeType, [
        first,
      ]))!,
      w = (await readRangeFixture(pg, `SELECT $1::${p.identity} span`, 'span', p.rangeType, [
        last,
      ]))!,
      m = (await readMultirangeFixture(pg, p.multirangeType, multi))!,
      items = (await readRangeArrayFixture(pg, p.rangeType, array))!
    const nested: OwnedArrayInputPayload = {
      elementType: '"public"."stage_history"',
      elementKind: 41,
      dimensions: [{ lower: 1, length: 2 }],
      elements: [{ kind: 'Array', value: structuredClone(items) }, { kind: 'Null' }],
      nullBitmap: { kind: 'Value', value: true },
    }
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const map = (row: unknown): Record<string, Result> =>
      Object.fromEntries(
        (
          generated.evaluatePublicArrayPayloadsChecks(row) as {
            constraint: string
            result: Result
          }[]
        ).map((c) => [c.constraint, c.result]),
      )
    // Public bounds are ranges of labels, so the compiled definitions decide every comparison and
    // nothing in the value can name another. A public array always starts at 1, and an array of
    // the array domain cannot nest its elements in a public value: nested lists are dimensions.
    const span = (lower: unknown, upper: unknown, upperInclusive = true) => ({
      empty: false,
      lower,
      upper,
      lowerInclusive: true,
      upperInclusive,
    })
    const publicV = span(span('z', 'mid'), span('mid', 'a')),
      publicW = span(span('mid', 'a'), null, false)
    const publicRow = {
      v: publicV,
      w: publicW,
      m: [publicV, publicW],
      items: [publicV, null, publicW],
      nested: [null] as unknown[],
      bypass: false,
    }
    const publicText = {
      v: first,
      w: last,
      m: multi,
      items: rangeArrayText([first, null, last]),
      nested: '{NULL}',
      bypass: 'false',
    }
    // Hashing an enum hashes its catalog OID, which only the deployment knows.
    const hashes = ['hash_range', 'hash_multirange', 'hash_items', 'hash_nested']
    for (const [row, text] of [
      [publicRow, publicText],
      [
        { ...publicRow, v: publicW, w: publicV },
        { ...publicText, v: last, w: first },
      ],
      [
        { ...publicRow, nested: [publicRow.items, null] },
        { ...publicText, nested: `{${publicText.items},NULL}` },
      ],
      [
        { ...publicRow, bypass: true },
        { ...publicText, bypass: 'true' },
      ],
    ] as const) {
      const before = structuredClone(row)
      const local = map(row),
        server = await serverCheckResults(pg, 'array_payloads', text)
      for (const name of hashes)
        if (!row.bypass && local[name]!.certain) {
          expect(local[name]).toEqual(server[name])
          delete local[name]
          delete server[name]
        } else if (!row.bypass) {
          delete local[name]
          delete server[name]
        }
      expect
        .soft({ row: JSON.stringify(row), results: local })
        .toEqual({ row: JSON.stringify(row), results: server })
      expect(row).toEqual(before)
    }
    for (const name of hashes)
      if (name !== 'hash_nested') expect(map(publicRow)[name]).toMatchObject({ certain: false })
    // A label outside the captured ones may have been added since, or the server may reject it as
    // it reads the row, so it decides no check that reads it, bypassed or not; the others still
    // decide.
    const added = { ...publicRow, v: span(span('z', 'added'), span('mid', 'a')) }
    expect(map(added).ordered).toMatchObject({ certain: false })
    const bypassed = map({ ...publicRow, bypass: true })
    for (const [name, result] of Object.entries(map({ ...added, bypass: true })))
      expect(result).toEqual(
        internal.reads('public.array_payloads', name).includes('v')
          ? { certain: false }
          : bypassed[name],
      )
    // Payloads, forged contexts included, are not public values.
    for (const payload of [
      v,
      { ...v, enumLabels: 'forged', enumCount: 999, boundProfile: { nodes: [{ child: -1 }] } },
    ])
      expect
        .soft(() => map({ ...publicRow, v: { kind: 'Value', value: payload } }))
        .toThrow(TypeError)
    expect
      .soft(() => map({ ...publicRow, items: { kind: 'Value', value: items } }))
      .toThrow(TypeError)
    // Stored values reach the evaluator entries directly: an array starting at -2 and an array of
    // the array domain, whose value no public input expresses.
    const range = (payload: RangeInputPayload): unknown =>
      runtime.makeCoercedRangeValue(rangeTypescriptInput(payload, runtime))
    const stored = {
      v: range(v),
      w: range(w),
      m: runtime.makeCoercedMultirangeValue(multirangeTypescriptInput(m, runtime)),
      items: runtime.makeArrayValue(arrayTypescriptInput(items, runtime)),
      nested: runtime.makeArrayValue(arrayTypescriptInput(nested, runtime)),
      bypass: runtime.makeBoolValue(false),
    }
    const undecided = (outcome: unknown) =>
      expect(['Unknown', 'Unimplemented']).toContain((outcome as { kind: string }).kind)
    const names = [
      'contained',
      'nested_order',
      'ordered',
      'output',
      'position',
      'hash_range',
      'hash_multirange',
      'hash_items',
      'hash_nested',
    ]
    const results = internal('public.array_payloads', stored)
    for (const name of names)
      if (hashes.includes(name)) undecided(results[name])
      else expect(results[name], name).toEqual({ kind: 'True' })
    const bad = structuredClone(v)
    const lower = bad.bounds[0]!
    if (lower.kind !== 'Range') throw new Error('expected range bound')
    lower.value.bounds[0] = { kind: 'Enum', value: { ordinal: 999, labelOid: 0n } }
    undecided(internal('public.array_payloads', { ...stored, v: range(bad) })['ordered'])
    expect(
      internal('public.array_payloads', {
        ...stored,
        v: range(bad),
        bypass: runtime.makeBoolValue(true),
      }),
    ).toEqual(Object.fromEntries(names.map((name) => [name, { kind: 'True' }])))
    undecided(
      internal('public.array_payloads', {
        ...stored,
        v: range({ ...v, elementType: 'public.other_label' }),
      })['ordered'],
    )
    // An entry handed a range without its compiled context, or with forged labels and support,
    // never decides from it. A forged bound profile is not a runtime value at all.
    const strip = (payload: RangeInputPayload, forge: boolean): RangeInputPayload => {
      const copy: RangeInputPayload = {
        ...payload,
        bounds: payload.bounds.map((cell) =>
          cell.kind === 'Range' ? { kind: 'Range', value: strip(cell.value, forge) } : cell,
        ),
      }
      delete copy.boundProfile
      delete copy.enumLabels
      delete copy.enumCount
      return forge
        ? {
            ...copy,
            enumLabels: 'forged',
            enumCount: 999,
            support: { comparison: 99, canonical: 99 },
          }
        : copy
    }
    for (const forge of [false, true])
      undecided(
        internal('public.array_payloads', { ...stored, v: range(strip(v, forge)) })['ordered'],
      )
    await pg.query(
      'INSERT INTO array_payloads VALUES($1,$2,$3,$4::stage_span[],ARRAY[($4::stage_span[])::stage_history,NULL::stage_history],false)',
      [first, last, multi, array],
    )
    await expect(
      pg.query(
        'INSERT INTO array_payloads VALUES($1,$2,$3,$4::stage_span[],ARRAY[($4::stage_span[])::stage_history,NULL::stage_history],false)',
        [last, first, multi, array],
      ),
    ).rejects.toMatchObject({ code: '23514' })
    const known = (value: ReturnType<typeof go.ident>) =>
      go.call(go.ident('KnownCheckValue'), [value])
    await writeFile(
      join(root, 'schema/public/array_fixture_test.go'),
      printGoFile({
        package: 'public',
        imports: [
          { alias: 'checkruntime', path: 'arraypublic/schema/public/checkrust/checkruntime' },
        ],
        declarations: [
          {
            kind: 'function',
            name: 'enumFixture',
            parameters: [],
            results: [{ type: go.ident('PublicArrayPayloadsCheckInput') }],
            body: [
              {
                kind: 'assign',
                targets: [go.ident('bypass')],
                expressions: [go.ident('false')],
                operator: ':=',
              },
              {
                kind: 'return',
                expressions: [
                  go.composite(go.ident('PublicArrayPayloadsCheckInput'), [
                    go.keyValue('V', known(rangeGoInput(v))),
                    go.keyValue('W', known(rangeGoInput(w))),
                    go.keyValue('M', known(multirangeGoInput(m))),
                    go.keyValue('Items', known(arrayGoInput(items))),
                    go.keyValue('Nested', known(arrayGoInput(nested))),
                    go.keyValue('Bypass', known(go.address(go.ident('bypass')))),
                  ]),
                ],
              },
            ],
          },
        ],
      }),
    )
    await writeFile(
      join(root, 'schema/public/array_payload_test.go'),
      `package public
import("testing";"reflect";checkruntime "arraypublic/schema/public/checkrust/checkruntime")
func forgeEnumSpan(span checkruntime.RangeValue)checkruntime.RangeValue{bounds:=make([]checkruntime.ArrayElement,len(span.Value.Bounds));copy(bounds,span.Value.Bounds);for i,cell:=range bounds{if cell.Kind==checkruntime.ArrayElementRange{bounds[i].Range=forgeEnumSpan(checkruntime.RangeValue{Kind:checkruntime.RangeValueValue,Value:cell.Range}).Value}};span.Value.Bounds=bounds;span.Value.EnumLabels="forged";span.Value.EnumCount=999;span.Value.Support=checkruntime.MakeRangeSupport(99,99);span.Value.BoundProfile=checkruntime.RangeBoundContext{Nodes:[]checkruntime.RangeBoundProfile{{Child:-1}}};return span}
func forgeEnumArray(input checkruntime.ArrayValue)checkruntime.ArrayValue{for i,cell:=range input.Value.Elements{if cell.Kind==checkruntime.ArrayElementRange{input.Value.Elements[i].Range=forgeEnumSpan(checkruntime.RangeValue{Kind:checkruntime.RangeValueValue,Value:cell.Range}).Value};if cell.Kind==checkruntime.ArrayElementArray{input.Value.Elements[i].Array=forgeEnumArray(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:cell.Array}).Value}};return input}
func TestEnumPayload(t *testing.T){
row:=enumFixture();row.V.V=forgeEnumSpan(row.V.V);row.W.V=forgeEnumSpan(row.W.V);for i,span:=range row.M.V.Value.Ranges{row.M.V.Value.Ranges[i]=forgeEnumSpan(span)};row.M.V.Value.Support=checkruntime.MakeRangeSupport(99,99);row.Items.V=forgeEnumArray(row.Items.V);row.Nested.V=forgeEnumArray(row.Nested.V)
before:=enumFixture();before.V.V=forgeEnumSpan(before.V.V);before.W.V=forgeEnumSpan(before.W.V);for i,span:=range before.M.V.Value.Ranges{before.M.V.Value.Ranges[i]=forgeEnumSpan(span)};before.M.V.Value.Support=checkruntime.MakeRangeSupport(99,99);before.Items.V=forgeEnumArray(before.Items.V);before.Nested.V=forgeEnumArray(before.Nested.V)
for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicArrayPayloadsChecks(row); if e != nil {panic(e)}; return r}(){switch c.Constraint{case "hash_range","hash_multirange","hash_items","hash_nested":if c.Result.Certain{t.Fatal("enum hash requires deployment catalog",c)};default:if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("compiled definition",c)}}}
if !reflect.DeepEqual(row,before){t.Fatal("input mutated")}
bad:=enumFixture().V.V;bad.Value.Bounds[0].Range.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:999,LabelOid:0}};row.V=KnownCheckValue(bad)
for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicArrayPayloadsChecks(row); if e != nil {return nil}; return r}(){if c.Constraint=="ordered"&&c.Result.Certain{t.Fatal("invalid ordinal",c)}}
skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicArrayPayloadsChecks(row); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy invalid bound",c)}}
}
`,
    )
    await writeFile(join(root, 'go.mod'), 'module arraypublic\n\ngo 1.25\n')
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/nested-range-payload', { recursive: true })
    await writeFile(
      'artifacts/nested-range-payload/report.json',
      JSON.stringify({
        nativeInserts: 2,
        independentCatalogs: true,
        compiledDefinitions: true,
        forgedOwnedContexts: true,
        recursiveArrays: true,
        enumHashCatalogRequired: true,
        nestedWirePortable: true,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
