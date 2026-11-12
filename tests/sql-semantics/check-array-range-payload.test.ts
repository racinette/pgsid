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
  type MultirangeInputPayload,
} from '../../tools/check-rust/multirange-input.js'
import {
  arrayGoInput,
  arrayTypescriptInput,
  type OwnedArrayInputPayload,
} from '../../tools/check-rust/array-input.js'
import { internalCheckRows, storedOrRejected } from '../support/check-entries.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { writeGoModule } from '../support/go-module.js'

it('injects compiled array-bound contexts before public range, multirange and recursive array validation in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-array-range-payload-')),
    run = promisify(execFile)
  try {
    const schema = `CREATE TYPE public.stage_label AS ENUM('z','a');ALTER TYPE public.stage_label ADD VALUE 'mid' BEFORE 'a';
      CREATE TYPE public.stage_span AS RANGE(subtype=public.stage_label[],multirange_type_name=stage_set);
      CREATE DOMAIN public.stage_history AS public.stage_span[];
      CREATE TABLE array_payloads(v stage_span,w stage_span,m stage_set,items stage_span[],nested stage_history[],bypass bool,
        CONSTRAINT ordered CHECK(CASE WHEN bypass THEN true ELSE v<w END),
        CONSTRAINT contained CHECK(CASE WHEN bypass THEN true ELSE m @> v END),
        CONSTRAINT position CHECK(CASE WHEN bypass THEN true ELSE array_position(items,v)=-2 END),
        CONSTRAINT nested_order CHECK(CASE WHEN bypass THEN true ELSE array_sort(nested)=nested END),
        CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE v::text='[{z},{mid}]' END),
        CONSTRAINT hash_range CHECK(CASE WHEN bypass THEN true ELSE hash_range(v) IS NOT NULL END),
        CONSTRAINT hash_multirange CHECK(CASE WHEN bypass THEN true ELSE hash_multirange(m) IS NOT NULL END),
        CONSTRAINT hash_items CHECK(CASE WHEN bypass THEN true ELSE hash_array(items) IS NOT NULL END),
        CONSTRAINT hash_nested CHECK(CASE WHEN bypass THEN true ELSE hash_array(nested) IS NOT NULL END));`
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg),
      p = customRangeProfiles(catalog)[0]!,
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
            `SELECT encode(range_send('[{z},{mid}]'::stage_span),'hex') value`,
          )
        ).rows[0]!.value
      expect(await wire(shifted)).not.toBe(await wire(pg))
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
    await run('node_modules/.bin/tsc', [
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
    const first = '[{z},{mid}]',
      last = '[{mid},{a}]',
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
    const map = (row: unknown) =>
      Object.fromEntries(
        (
          generated.evaluatePublicArrayPayloadsChecks(row) as {
            constraint: string
            result: Result
          }[]
        ).map((c) => [c.constraint, c.result]),
      )
    // Public bounds are arrays of enum labels, and every check decides what PostgreSQL decides,
    // except that hashing an enum reads its OIDs, which only the database holds. nested holds only
    // NULLs, so its hash reads none.
    const span = (lower: string[], upper: string[]) => ({
      empty: false,
      lower: { value: lower, inclusive: true },
      upper: { value: upper, inclusive: true },
    })
    const quoted = (value: string) => `"${value.replace(/["\\]/gu, (c) => '\\' + c)}"`
    const publicFirst = span(['z'], ['mid']),
      publicLast = span(['mid'], ['a'])
    const mismatches: ReturnType<typeof differingChecks> = []
    for (const [first, last, bypass] of [
      [publicFirst, publicLast, false],
      [publicLast, publicFirst, false],
      [publicFirst, publicLast, true],
    ] as const) {
      const row = {
        v: first,
        w: last,
        m: [first, last],
        items: [first, null, last],
        nested: [null, null],
        bypass,
      }
      const before = structuredClone(row)
      const local = map(row)
      expect(row).toEqual(before)
      const firstText = first === publicFirst ? '[{z},{mid}]' : '[{mid},{a}]',
        lastText = first === publicFirst ? '[{mid},{a}]' : '[{z},{mid}]'
      const server = await serverCheckResults(pg, 'array_payloads', {
        v: firstText,
        w: lastText,
        m: multi,
        items: `{${quoted(firstText)},NULL,${quoted(lastText)}}`,
        nested: '{NULL,NULL}',
        bypass: String(bypass),
      })
      if (!bypass)
        for (const name of Object.keys(server).filter(
          (name) => name.startsWith('hash_') && name !== 'hash_nested',
        )) {
          expect(local[name], name).toMatchObject({ certain: false })
          delete local[name]
          delete server[name]
        }
      mismatches.push(...differingChecks(JSON.stringify(row), local, server))
    }
    expect(mismatches).toEqual([])
    // Stored values go to the evaluator entries directly: arrays starting at -2, arrays of the array
    // domain with elements, contexts the values carry, ordinals outside the labels and other
    // element types.
    const stored = (
      values: { v: RangeInputPayload; w: RangeInputPayload; m: MultirangeInputPayload },
      arrays: { items: OwnedArrayInputPayload; nested: OwnedArrayInputPayload },
      bypass = false,
    ) =>
      internal('public.array_payloads', {
        v: runtime.makeCoercedRangeValue(rangeTypescriptInput(values.v, runtime)),
        w: runtime.makeCoercedRangeValue(rangeTypescriptInput(values.w, runtime)),
        m: runtime.makeCoercedMultirangeValue(multirangeTypescriptInput(values.m, runtime)),
        items: runtime.makeArrayValue(arrayTypescriptInput(arrays.items, runtime)),
        nested: runtime.makeArrayValue(arrayTypescriptInput(arrays.nested, runtime)),
        bypass: runtime.makeBoolValue(bypass),
      })
    const undecided = (outcome: unknown, label: string) =>
      expect(['Unknown', 'Unimplemented'], label).toContain((outcome as { kind: string }).kind)
    for (const forge of [false, true]) {
      const candidate = structuredClone({ values: { v, w, m }, arrays: { items, nested } })
      const edit = (value: unknown): void => {
        if (!value || typeof value !== 'object') return
        if ('bounds' in value && 'elementKind' in value && forge)
          Object.assign(value, {
            enumLabels: 'forged',
            enumCount: 999,
            support: { comparison: 99, canonical: 99 },
            boundProfile: { nodes: [{ child: -1 }] },
          })
        for (const child of Object.values(value))
          if (Array.isArray(child)) child.forEach(edit)
          else edit(child)
      }
      edit(candidate)
      const results = storedOrRejected(() => stored(candidate.values, candidate.arrays))
      // The values' own contexts decide; forged ones never decide wrongly.
      if (!forge) expect(results).toBeDefined()
      for (const [constraint, result] of Object.entries(results ?? {}))
        if (constraint.startsWith('hash_')) undecided(result, `${forge} ${constraint}`)
        else if (!forge) expect(result, constraint).toEqual({ kind: 'True' })
        else
          expect(['True', 'Unknown', 'Unimplemented'], constraint).toContain(
            (result as { kind: string }).kind,
          )
      const bad = structuredClone(candidate)
      const lower = bad.values.v.bounds[0]!
      if (lower.kind !== 'Array') throw new Error('expected array bound')
      lower.value.elements[0] = { kind: 'Enum', value: { ordinal: 999, labelOid: 0n } }
      const badResults = storedOrRejected(() => stored(bad.values, bad.arrays))
      if (badResults) undecided(badResults['ordered'], `${forge} ordered`)
      const skipped = storedOrRejected(() => stored(bad.values, bad.arrays, true))
      if (!forge) expect(skipped).toBeDefined()
      for (const [constraint, result] of Object.entries(skipped ?? {}))
        expect(result, constraint).toEqual({ kind: 'True' })
      const wrong = structuredClone(candidate)
      wrong.values.v.elementType = 'public.other_label'
      const wrongResults = storedOrRejected(() => stored(wrong.values, wrong.arrays))
      if (wrongResults) undecided(wrongResults['ordered'], `${forge} wrong ordered`)
    }
    // The former payloads are not public values. A range over arrays is left undecided whole, so
    // its shape is not checked yet; a malformed one there is at least never decided.
    const publicRow = {
      v: publicFirst,
      w: publicLast,
      m: [publicFirst, publicLast],
      items: [publicFirst, null, publicLast],
      nested: [null, null],
      bypass: false,
    }
    for (const value of [
      { ...publicRow, m: { kind: 'Value', value: m } },
      { ...publicRow, items: { kind: 'Value', value: items } },
      { ...publicRow, nested: { kind: 'Value', value: nested } },
      { ...publicRow, m: { kind: 'Unknown' } },
      { ...publicRow, items: { kind: 'Null' } },
      { ...publicRow, v: 'empty' },
    ])
      expect(() => map(value)).toThrow(TypeError)
    for (const value of [{ kind: 'Value', value: v }, [publicFirst]])
      expectUndecidedOrRejected(
        () => map({ ...publicRow, v: value }),
        Array.isArray(value) ? 'list' : 'payload',
        ['ordered', 'contained', 'position', 'output'],
      )
    // A bound is null or its value with an inclusivity: the former flat bounds with flags, a null
    // or missing bound value and a bound without a boolean inclusivity are malformed.
    for (const value of [
      { empty: false, lower: ['z'], upper: ['mid'], lowerInclusive: true, upperInclusive: true },
      { empty: false, lower: { value: null, inclusive: true }, upper: publicFirst.upper },
      { empty: false, lower: { inclusive: true }, upper: publicFirst.upper },
      { empty: false, lower: publicFirst.lower, upper: { value: ['mid'] } },
      { empty: false, lower: publicFirst.lower, upper: { value: ['mid'], inclusive: null } },
    ])
      for (const change of [{ v: value }, { m: [value] }, { items: [value] }])
        expect(() => map({ ...publicRow, ...change }), JSON.stringify(change)).toThrow(TypeError)
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
func forgeEnumSpan(span checkruntime.RangeValue)checkruntime.RangeValue{span.Value.EnumLabels="forged";span.Value.EnumCount=999;span.Value.Support=checkruntime.MakeRangeSupport(99,99);span.Value.BoundProfile=checkruntime.RangeBoundContext{Nodes:[]checkruntime.RangeBoundProfile{{Child:-1}}};return span}
func forgeEnumArray(input checkruntime.ArrayValue)checkruntime.ArrayValue{for i,cell:=range input.Value.Elements{if cell.Kind==checkruntime.ArrayElementRange{input.Value.Elements[i].Range=forgeEnumSpan(checkruntime.RangeValue{Kind:checkruntime.RangeValueValue,Value:cell.Range}).Value};if cell.Kind==checkruntime.ArrayElementArray{input.Value.Elements[i].Array=forgeEnumArray(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:cell.Array}).Value}};return input}
func TestEnumPayload(t *testing.T){
row:=enumFixture();row.V.V=forgeEnumSpan(row.V.V);row.W.V=forgeEnumSpan(row.W.V);for i,span:=range row.M.V.Value.Ranges{row.M.V.Value.Ranges[i]=forgeEnumSpan(span)};row.M.V.Value.Support=checkruntime.MakeRangeSupport(99,99);row.Items.V=forgeEnumArray(row.Items.V);row.Nested.V=forgeEnumArray(row.Nested.V)
before:=enumFixture();before.V.V=forgeEnumSpan(before.V.V);before.W.V=forgeEnumSpan(before.W.V);for i,span:=range before.M.V.Value.Ranges{before.M.V.Value.Ranges[i]=forgeEnumSpan(span)};before.M.V.Value.Support=checkruntime.MakeRangeSupport(99,99);before.Items.V=forgeEnumArray(before.Items.V);before.Nested.V=forgeEnumArray(before.Nested.V)
for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicArrayPayloadsChecks(row); if e != nil {panic(e)}; return r}(){switch c.Constraint{case "hash_range","hash_multirange","hash_items","hash_nested":if c.Result.Certain{t.Fatal("enum hash requires deployment catalog",c)};default:if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("compiled definition",c)}}}
if !reflect.DeepEqual(row,before){t.Fatal("input mutated")}
bad:=enumFixture().V.V;bad.Value.Bounds[0].Array.Elements[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:999,LabelOid:0}};row.V=KnownCheckValue(bad)
for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicArrayPayloadsChecks(row); if e != nil {return nil}; return r}(){if c.Constraint=="ordered"&&c.Result.Certain{t.Fatal("invalid ordinal",c)}}
skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicArrayPayloadsChecks(row); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy invalid bound",c)}}
}
`,
    )
    await writeGoModule(root, 'arraypublic')
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/array-range-payload', { recursive: true })
    await writeFile(
      'artifacts/array-range-payload/report.json',
      JSON.stringify({
        nativeInserts: 2,
        independentCatalogs: true,
        compiledDefinitions: true,
        forgedOwnedContexts: true,
        recursiveArrays: true,
        enumHashCatalogRequired: true,
        arrayWireCatalogHeaderRequired: true,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
