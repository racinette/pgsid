import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { rangeTypescriptInput, type RangeInputPayload } from '../../tools/check-rust/range-input.js'
import { multirangeTypescriptInput } from '../../tools/check-rust/multirange-input.js'
import { arrayTypescriptInput } from '../../tools/check-rust/array-input.js'
import { internalCheckRows, storedOrRejected } from '../support/check-entries.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'

it('copies public composite range, multirange and array rows with compiled field contexts and no caller OID or support assumptions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-public-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE leaf AS(n int2,phase stage);CREATE TYPE span AS RANGE(subtype=leaf);
CREATE TABLE gate(a span,m span_multirange,bag span[],bypass bool NOT NULL,
CONSTRAINT lower_n CHECK(CASE WHEN bypass THEN true ELSE (lower(a)).n>=2 END),
CONSTRAINT equal CHECK(CASE WHEN bypass THEN true ELSE a=a END),
CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE a::text='["(2,z)","(5,a)")' END),
CONSTRAINT multi_output CHECK(CASE WHEN bypass THEN true ELSE m::text='{["(2,z)","(5,a)")}' END),
CONSTRAINT array_output CHECK(CASE WHEN bypass THEN true ELSE (bag[1])::text='["(2,z)","(5,a)")' END));
INSERT INTO gate SELECT a,span_multirange(a),ARRAY[a],false FROM(SELECT span(ROW(2,'z')::leaf,ROW(5,'a')::leaf) a) q;`)
    const catalog = await snapshotCatalog(pg),
      options = {
        enums: catalog.enums,
        rangeTypes: catalog.rangeTypes,
        compositeTypeGraph: catalog.compositeTypeGraph,
        executionContext: { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const },
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      options,
    )
    const generatedGo = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'compositerangepublic/schema',
    )
    expect(generatedGo.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    for (const artifact of [
      { path: join(root, 'checks.ts'), content: ts.checks },
      ...checkTypescriptArtifacts(ts.rustFiles!).map((a) => ({
        path: join(root, 'checks-rust', a.path),
        content: a.content,
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
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (row: unknown) =>
      Object.fromEntries(
        (generated.evaluatePublicGateChecks(row) as { constraint: string; result: Result }[]).map(
          (c) => [c.constraint, c.result],
        ),
      )
    const names = ['lower_n', 'equal', 'output', 'multi_output', 'array_output']
    const expected = Object.fromEntries(names.map((name) => [name, { certain: true, value: true }]))
    // Public bounds are records of their fields, so each row decides what PostgreSQL decides.
    type Leaf = { n?: unknown; phase?: unknown } | null
    const span = (lower: Leaf, upper: Leaf) => ({
      empty: false,
      lower,
      upper,
      lowerInclusive: lower !== null,
      upperInclusive: false,
    })
    const quoted = (value: string) => `"${value.replace(/["\\]/gu, (c) => '\\' + c)}"`
    const leafText = (leaf: Leaf) =>
      leaf === null ? '' : quoted(`(${leaf.n ?? ''},${leaf.phase ?? ''})`)
    const spanText = (value: ReturnType<typeof span>) =>
      `${value.lowerInclusive ? '[' : '('}${leafText(value.lower)},${leafText(value.upper)})`
    const good = span({ n: 2, phase: 'z' }, { n: 5, phase: 'a' })
    const row = { a: good, m: [good], bag: [good], bypass: false }
    const before = structuredClone(row)
    expect(evaluate(row)).toEqual(expected)
    expect(row).toEqual(before)
    const mismatches: ReturnType<typeof differingChecks> = []
    for (const [a, bypass] of [
      [good, false],
      [good, true],
      [span({ n: 40000, phase: 'z' }, { n: 5, phase: 'a' }), false],
      [span({ n: 40000, phase: 'z' }, { n: 5, phase: 'a' }), true],
      [span({ n: 2 }, { n: 5, phase: 'a' }), false],
      [span({ n: 2, phase: 'added' }, { n: 5, phase: 'a' }), false],
      [span({ n: 2, phase: 'added' }, { n: 5, phase: 'a' }), true],
      [span(null, { n: 5, phase: 'a' }), false],
      [span({ n: 5, phase: 'a' }, { n: 2, phase: 'z' }), false],
    ] as const) {
      // A label the captured catalog lacks may have been added since, so the row stays undecided.
      if (JSON.stringify(a).includes('"added"')) {
        expectUndecidedOrRejected(
          () => evaluate({ a, m: [a], bag: [a], bypass }),
          JSON.stringify(a),
        )
        continue
      }
      const text = spanText(a)
      mismatches.push(
        ...differingChecks(
          JSON.stringify({ a, bypass }),
          evaluate({ a, m: [a], bag: [a], bypass }),
          await serverCheckResults(pg, 'gate', {
            a: text,
            m: `{${text}}`,
            bag: `{${quoted(text)}}`,
            bypass: String(bypass),
          }),
        ),
      )
    }
    expect(mismatches).toEqual([])
    // Stored ranges go to the evaluator entries directly: whatever support, bound profile, enum
    // labels and label OIDs they carry, identities other than the column's, unknown fields and
    // ordinals outside the labels.
    const profile = customRangeProfiles(catalog).find((item) => item.name === 'span')!
    const fixture = (await readRangeFixture(
      pg,
      `SELECT span(ROW(2,'z')::leaf,ROW(5,'a')::leaf) span`,
      'span',
      profile.rangeType,
    ))!
    const outcome = (result: unknown): Result => {
      const kind = (result as { kind: string }).kind
      return kind === 'True' || kind === 'False' || kind === 'Null'
        ? { certain: true, value: kind === 'Null' ? null : kind === 'True' }
        : kind === 'Error'
          ? {
              certain: true,
              error: (result as { value: { state: number } }).value.state
                .toString(36)
                .toUpperCase()
                .padStart(5, '0'),
            }
          : { certain: false }
    }
    // The multirange and array hold the same range, as the row read from the table does.
    const stored = (value: RangeInputPayload, bypass = false) =>
      Object.fromEntries(
        Object.entries(
          internal('public.gate', {
            a: runtime.makeCoercedRangeValue(rangeTypescriptInput(value, runtime)),
            m: runtime.makeCoercedMultirangeValue(
              multirangeTypescriptInput(
                {
                  typeName: 'public.span_multirange',
                  rangeType: value.typeName,
                  elementType: value.elementType,
                  elementKind: value.elementKind,
                  ranges: [{ kind: 'Value', value }],
                },
                runtime,
              ),
            ),
            bag: runtime.makeArrayValue(
              arrayTypescriptInput(
                {
                  elementType: value.typeName,
                  elementKind: 42,
                  dimensions: [{ lower: 1, length: 1 }],
                  elements: [{ kind: 'Range', value }],
                  nullBitmap: { kind: 'Value', value: false },
                },
                runtime,
              ),
            ),
            bypass: runtime.makeBoolValue(bypass),
          }),
        ).map(([name, result]) => [name, outcome(result)]),
      )
    expect(stored(fixture)).toEqual(expected)
    const field = (value: RangeInputPayload, bound: number, index: number) => {
      const cell = value.bounds[bound]!
      if (cell.kind !== 'Composite') throw new Error('expected a record bound')
      return cell.value.fields[index]!
    }
    const forged = structuredClone(fixture)
    Object.assign(forged, {
      support: { comparison: 0, canonical: 0 },
      boundProfile: { nodes: [] },
      enumLabels: 'caller',
      enumCount: 99,
    })
    for (const bound of [0, 1])
      Object.assign(field(forged, bound, 1), {
        kind: 'Enum',
        value: { ordinal: bound, labelOid: 987654321n },
      })
    for (const [name, result] of Object.entries(stored(forged)))
      if (result.certain) expect(result, name).toEqual(expected[name])
    const mutations: ((v: RangeInputPayload) => void)[] = [
      (v) => {
        v.elementType = 'public.other'
      },
      (v) => {
        const cell = v.bounds[0]!
        if (cell.kind !== 'Composite') throw new Error('expected a record bound')
        cell.value.typeName = 'public.other'
      },
      (v) => {
        const cell = v.bounds[0]!
        if (cell.kind !== 'Composite') throw new Error('expected a record bound')
        cell.value.fields.pop()
      },
      (v) => {
        Object.assign(field(v, 0, 0), { kind: 'Int2', value: 40000 })
      },
      (v) => {
        Object.assign(field(v, 0, 1), { kind: 'Enum', value: { ordinal: 99, labelOid: 0n } })
      },
    ]
    for (const [index, mutate] of mutations.entries()) {
      const invalid = structuredClone(fixture)
      mutate(invalid)
      const results = storedOrRejected(() => stored(invalid))
      if (results)
        for (const [name, result] of Object.entries(results))
          expect(result, `${index} ${name}`).toEqual({ certain: false })
      const skipped = storedOrRejected(() => stored(invalid, true))
      if (skipped) expect(skipped, String(index)).toEqual(expected)
    }
    const partial = structuredClone(fixture)
    Object.assign(field(partial, 0, 0), { kind: 'Unknown' })
    expect(stored(partial).lower_n).toEqual({ certain: false })
    const nullBound = structuredClone(fixture)
    Object.assign(nullBound.bounds[0]!, { kind: 'Null' })
    nullBound.lowerInclusive = false
    expect(stored(nullBound).lower_n).toEqual({ certain: true, value: null })
    // The former payloads are not public values. A range of records is left undecided whole, so
    // its shape is not checked yet; a malformed one there is at least never decided.
    const payload = { kind: 'Value', value: fixture }
    for (const value of [
      { ...row, m: { kind: 'Value', value: { ranges: [payload] } } },
      { ...row, bag: { kind: 'Value', value: { elements: [payload] } } },
      { ...row, m: payload },
      { ...row, bag: payload },
      { ...row, a: 'empty' },
    ])
      expect(() => evaluate(value)).toThrow(TypeError)
    for (const a of [payload, [good]])
      expectUndecidedOrRejected(
        () => evaluate({ ...row, a }),
        Array.isArray(a) ? 'list' : 'payload',
        ['lower_n', 'equal', 'output'],
      )
    await writeFile(
      join(root, 'schema/public/composite_range_test.go'),
      `package public
import("testing";"reflect";checkruntime "compositerangepublic/schema/public/checkrust/checkruntime")
func TestCompositeRangeInputs(t *testing.T){
 record:=func(n int,phase int)checkruntime.ArrayElement{return checkruntime.ArrayElement{Kind:checkruntime.ArrayElementComposite,Composite:checkruntime.CompositePayload{TypeName:"public.leaf",Fields:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt2,Int2:n},{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:phase,LabelOid:987654321}}}}}}
 good:=checkruntime.RangeValue{Kind:checkruntime.RangeValueValue,Value:checkruntime.RangePayload{TypeName:"public.span",ElementType:"public.leaf",ElementKind:44,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{record(2,0),record(5,1)},EnumLabels:"caller",EnumCount:99}}
 evaluate:=func(a checkruntime.RangeValue,skip bool)[]CheckEvaluation{
 m:=checkruntime.MultirangeValue{Kind:checkruntime.MultirangeValueValue,Value:checkruntime.MultirangePayload{TypeName:"public.span_multirange",RangeType:"public.span",ElementType:"public.leaf",ElementKind:44,Ranges:[]checkruntime.RangeValue{a}}}
 bag:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:"public.span",ElementKind:42,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:1}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementRange,Range:a.Value}},NullBitmap:checkruntime.BoolValue{Kind:checkruntime.BoolValueValue,Value:false}}}
 return func() []CheckEvaluation {r, e := EvaluatePublicGateChecks(PublicGateCheckInput{A:KnownCheckValue(a),M:KnownCheckValue(m),Bag:KnownCheckValue(bag),Bypass:KnownCheckValue(skip)}); if e != nil {return nil}; return r}()}
 good=checkruntime.CopyRangeValue(good)
 before:=checkruntime.CopyRangeValue(good)
 if len(evaluate(good,false))==0{t.Fatal("valid input rejected")}
 if !reflect.DeepEqual(good,before){t.Fatal("snapshot normalization") }
 for _,r:=range evaluate(good,false){if !r.Result.Certain||!r.Result.Value.Valid||!r.Result.Value.Value{t.Fatal(r)}}
 if !reflect.DeepEqual(good,before){t.Fatal("input mutated")}
 mutations:=[]func(*checkruntime.RangeValue){func(v *checkruntime.RangeValue){v.Value.ElementType="public.other"},func(v *checkruntime.RangeValue){v.Value.Bounds[0].Composite.TypeName="public.other"},func(v *checkruntime.RangeValue){v.Value.Bounds[0].Composite.Fields=v.Value.Bounds[0].Composite.Fields[:1]},func(v *checkruntime.RangeValue){v.Value.Bounds[0].Composite.Fields[0].Int2=40000},func(v *checkruntime.RangeValue){v.Value.Bounds[0].Composite.Fields[1].Enum.Ordinal=99}}
 for _,mutate:=range mutations{v:=checkruntime.CopyRangeValue(good);mutate(&v);for _,r:=range evaluate(v,false){if r.Result.Certain{t.Fatal("invalid accepted",r)}};for _,r:=range evaluate(v,true){if !r.Result.Certain||!r.Result.Value.Valid||!r.Result.Value.Value{t.Fatal("lazy bypass",r)}}}
}
`,
    )
    await writeFile(join(root, 'schema/go.mod'), 'module compositerangepublic/schema\n\ngo 1.23\n')
    await run('go', ['test', './...'], { cwd: join(root, 'schema') }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await writeFile(
      'artifacts/goal-checks/composite-range-sql-active/public-report.json',
      JSON.stringify({
        typescriptMutations: mutations.length,
        goMutations: 5,
        independentAdapters: true,
        snapshots: true,
        enumOidHintsDiscarded: true,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
