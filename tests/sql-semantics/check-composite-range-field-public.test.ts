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

it('copies custom range fields in public composite bounds through compiled child contexts and independent snapshots', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-field-public-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE inner_span AS RANGE(subtype=int2);CREATE TYPE leaf AS(n int2,phase stage,period inner_span);CREATE TYPE span AS RANGE(subtype=leaf);
CREATE TABLE gate(a span,m span_multirange,bag span[],bypass bool NOT NULL,
CONSTRAINT lower_n CHECK(CASE WHEN bypass THEN true ELSE (lower(a)).n>=2 END),
CONSTRAINT equal CHECK(CASE WHEN bypass THEN true ELSE a=a END),
CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE length(a::text)>2 END),
CONSTRAINT multi_output CHECK(CASE WHEN bypass THEN true ELSE length(m::text)>2 END),
CONSTRAINT array_output CHECK(CASE WHEN bypass THEN true ELSE length((bag[1])::text)>2 END));
INSERT INTO gate SELECT a,span_multirange(a),ARRAY[a],false FROM(SELECT span(ROW(2,'z','[1,3)'::inner_span)::leaf,ROW(5,'a','[1,3)'::inner_span)::leaf) a) q;`)
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
      'compositerangefieldpublic/schema',
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
    type Bound = { value: unknown; inclusive: boolean } | null
    type Period = { empty: boolean; lower?: Bound; upper?: Bound }
    type Leaf = { n?: unknown; phase?: unknown; period?: Period } | null
    const span = (lower: Leaf, upper: Leaf) => ({
      empty: false,
      lower: lower === null ? null : { value: lower, inclusive: true },
      upper: upper === null ? null : { value: upper, inclusive: false },
    })
    const quoted = (value: string) => `"${value.replace(/["\\]/gu, (c) => '\\' + c)}"`
    const periodText = (period: Period | undefined) =>
      period === undefined
        ? ''
        : quoted(
            period.empty
              ? 'empty'
              : `${period.lower?.inclusive ? '[' : '('}${String(period.lower?.value ?? '')},${String(period.upper?.value ?? '')}${period.upper?.inclusive ? ']' : ')'}`,
          )
    const leafText = (leaf: Leaf) =>
      leaf === null
        ? ''
        : quoted(`(${leaf.n ?? ''},${leaf.phase ?? ''},${periodText(leaf.period)})`)
    const spanText = (value: ReturnType<typeof span>) =>
      `${value.lower?.inclusive ? '[' : '('}${leafText(value.lower?.value ?? null)},${leafText(value.upper?.value ?? null)}${value.upper?.inclusive ? ']' : ')'}`
    const period = (lower: number, upper: number): Period => ({
      empty: false,
      lower: { value: lower, inclusive: true },
      upper: { value: upper, inclusive: false },
    })
    const leaf = (n: unknown, phase: unknown, inner = period(1, 3)) => ({ n, phase, period: inner })
    const good = span(leaf(2, 'z'), leaf(5, 'a'))
    const row = { a: good, m: [good], bag: [good], bypass: false }
    const before = structuredClone(row)
    expect(evaluate(row)).toEqual(expected)
    expect(row).toEqual(before)
    const mismatches: ReturnType<typeof differingChecks> = []
    for (const [a, bypass] of [
      [good, false],
      [good, true],
      [span(leaf(40000, 'z'), leaf(5, 'a')), false],
      [span(leaf(40000, 'z'), leaf(5, 'a')), true],
      [span({ n: 2 }, leaf(5, 'a')), false],
      [span(leaf(2, 'added'), leaf(5, 'a')), false],
      [span(leaf(2, 'added'), leaf(5, 'a')), true],
      [span(null, leaf(5, 'a')), false],
      [span(leaf(5, 'a'), leaf(2, 'z')), false],
      [span(leaf(2, 'z', period(1, 40000)), leaf(5, 'a')), false],
      [span(leaf(2, 'z', period(3, 1)), leaf(5, 'a')), true],
      [span(leaf(2, 'z', period(1, 2)), leaf(2, 'z')), false],
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
    // A bound is null or its value with an inclusivity, in the outer range and in the range field
    // of its records alike; the former flat bounds with flags, a missing or null bound value and a
    // bound without its inclusivity are malformed wherever the range sits.
    const flat = { lowerInclusive: true, upperInclusive: false }
    // A range field of a shape its type rules out.
    const malformed = (period: unknown) => leaf(2, 'z', period as Period)
    for (const a of [
      { empty: false, lower: leaf(2, 'z'), upper: leaf(5, 'a'), ...flat },
      { empty: false, lower: { value: null, inclusive: true }, upper: good.upper },
      { empty: false, lower: { inclusive: true }, upper: good.upper },
      { empty: false, lower: { value: leaf(2, 'z') }, upper: good.upper },
      span(malformed({ empty: false, lower: 1, upper: 3, ...flat }), leaf(5, 'a')),
      span(
        malformed({ empty: false, lower: { value: 1, inclusive: true }, upper: { value: null } }),
        leaf(5, 'a'),
      ),
      span(malformed({ empty: false, lower: { value: 1 }, upper: null }), leaf(5, 'a')),
    ])
      for (const value of [
        { ...row, a },
        { ...row, m: [a] },
        { ...row, bag: [a] },
      ])
        expect(() => evaluate(value), JSON.stringify(value)).toThrow(TypeError)
    // Stored ranges go to the evaluator entries directly: whatever support, bound profile, enum
    // labels and label OIDs they carry, identities other than the column's, unknown fields and
    // ordinals outside the labels.
    const profile = customRangeProfiles(catalog).find((item) => item.name === 'span')!
    const fixture = (await readRangeFixture(
      pg,
      `SELECT span(ROW(2,'z','[1,3)'::inner_span)::leaf,ROW(5,'a','[1,3)'::inner_span)::leaf) span`,
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
    for (const bound of [0, 1]) {
      const child = field(forged, bound, 2)
      if (child.kind !== 'Range') throw new Error('Missing child range fixture')
      Object.assign(child.value, {
        support: { comparison: 0, canonical: 0 },
        boundProfile: { nodes: [] },
        enumLabels: 'caller',
        enumCount: 99,
      })
    }
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
      (v) => {
        const child = field(v, 0, 2)
        if (child.kind !== 'Range') throw new Error('Missing child range fixture')
        child.value.typeName = 'public.other'
      },
      (v) => {
        const child = field(v, 0, 2)
        if (child.kind !== 'Range') throw new Error('Missing child range fixture')
        Object.assign(child.value.bounds[0]!, { kind: 'Int2', value: 40000 })
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
import("testing";"reflect";checkruntime "compositerangefieldpublic/schema/public/checkrust/checkruntime")
func TestCompositeRangeInputs(t *testing.T){
 record:=func(n int,phase int)checkruntime.ArrayElement{return checkruntime.ArrayElement{Kind:checkruntime.ArrayElementComposite,Composite:checkruntime.CompositePayload{TypeName:"public.leaf",Fields:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt2,Int2:n},{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:phase,LabelOid:987654321}},{Kind:checkruntime.ArrayElementRange,Range:checkruntime.RangePayload{TypeName:"public.inner_span",ElementType:"pg_catalog.int2",ElementKind:1,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt2,Int2:1},{Kind:checkruntime.ArrayElementInt2,Int2:3}},EnumCount:99,EnumLabels:"caller"}}}}}}
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
 mutations=append(mutations,func(v *checkruntime.RangeValue){v.Value.Bounds[0].Composite.Fields[2].Range.TypeName="public.other"},func(v *checkruntime.RangeValue){v.Value.Bounds[0].Composite.Fields[2].Range.Bounds[0].Int2=40000})
 for _,mutate:=range mutations{v:=checkruntime.CopyRangeValue(good);mutate(&v);for _,r:=range evaluate(v,false){if r.Result.Certain{t.Fatal("invalid accepted",r)}};for _,r:=range evaluate(v,true){if !r.Result.Certain||!r.Result.Value.Valid||!r.Result.Value.Value{t.Fatal("lazy bypass",r)}}}
}
`,
    )
    await writeFile(
      join(root, 'schema/go.mod'),
      'module compositerangefieldpublic/schema\n\ngo 1.23\n',
    )
    await run('go', ['test', './...'], { cwd: join(root, 'schema') }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/goal-checks/composite-range-field-dependencies-active', {
      recursive: true,
    })
    await writeFile(
      'artifacts/goal-checks/composite-range-field-dependencies-active/public-report.json',
      JSON.stringify({
        typescriptMutations: mutations.length,
        goMutations: 7,
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
