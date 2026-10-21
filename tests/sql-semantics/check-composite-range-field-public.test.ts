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
    const evaluate = (row: unknown) =>
      Object.fromEntries(
        (
          generated.evaluatePublicGateChecks(row) as {
            constraint: string
            result: { certain: boolean; value?: boolean | null }
          }[]
        ).map((c) => [c.constraint, c.result]),
      )
    const p = {
      kind: 'Value',
      value: {
        typeName: 'public.span',
        elementType: 'public.leaf',
        elementKind: 44,
        empty: false,
        lowerInclusive: true,
        upperInclusive: false,
        bounds: [2, 5].map((n, i) => ({
          kind: 'Composite',
          value: {
            typeName: 'public.leaf',
            fields: [
              { kind: 'Int2', value: n },
              { kind: 'Enum', value: { ordinal: i, labelOid: 987654321n } },
              {
                kind: 'Range',
                value: {
                  typeName: 'public.inner_span',
                  elementType: 'pg_catalog.int2',
                  elementKind: 1,
                  empty: false,
                  lowerInclusive: true,
                  upperInclusive: false,
                  bounds: [
                    { kind: 'Int2', value: 1 },
                    { kind: 'Int2', value: 3 },
                  ],
                  support: { comparison: 0, canonical: 0 },
                  boundProfile: { nodes: [] },
                  enumLabels: 'caller',
                  enumCount: 99,
                },
              },
            ],
          },
        })),
        support: { comparison: 0, canonical: 0 },
        boundProfile: { nodes: [] },
        enumLabels: 'caller',
        enumCount: 99,
      },
    }
    const row = {
      a: p,
      m: {
        kind: 'Value',
        value: {
          typeName: 'public.span_multirange',
          rangeType: 'public.span',
          elementType: 'public.leaf',
          elementKind: 44,
          support: { comparison: 0, canonical: 0 },
          ranges: [p],
        },
      },
      bag: {
        kind: 'Value',
        value: {
          elementType: 'public.span',
          elementKind: 42,
          dimensions: [{ lower: 1, length: 1 }],
          elements: [{ kind: 'Range', value: p.value }],
          nullBitmap: { kind: 'Value', value: false },
        },
      },
      bypass: false,
    }
    const expected = Object.fromEntries(
      ['lower_n', 'equal', 'output', 'multi_output', 'array_output'].map((name) => [
        name,
        { certain: true, value: true },
      ]),
    )
    const before = structuredClone(row)
    expect(evaluate(row)).toEqual(expected)
    expect(row).toEqual(before)
    const mutations: ((v: typeof row) => void)[] = [
      (v) => {
        v.a.value.elementType = 'public.other'
      },
      (v) => {
        v.a.value.bounds[0]!.value.typeName = 'public.other'
      },
      (v) => {
        v.a.value.bounds[0]!.value.fields.pop()
      },
      (v) => {
        Object.assign(v.a.value.bounds[0]!.value.fields[0]!, { kind: 'Int2', value: 40000 })
      },
      (v) => {
        Object.assign(v.a.value.bounds[0]!.value.fields[1]!, {
          kind: 'Enum',
          value: { ordinal: 99, labelOid: 0n },
        })
      },
    ]
    mutations.push(
      (v) => {
        const p = v.a.value.bounds[0]!.value.fields[2]!.value
        if (typeof p !== 'object' || !p.bounds) throw new Error('Missing child range fixture')
        p.typeName = 'public.other'
      },
      (v) => {
        const p = v.a.value.bounds[0]!.value.fields[2]!.value
        if (typeof p !== 'object' || !p.bounds) throw new Error('Missing child range fixture')
        p.bounds[0]!.value = 40000
      },
    )
    for (const mutate of mutations) {
      const invalid = structuredClone(row)
      mutate(invalid)
      for (const result of Object.values(evaluate(invalid)))
        expect(result).toMatchObject({ certain: false })
      expect(evaluate({ ...invalid, bypass: true })).toEqual(expected)
    }
    const partial = structuredClone(row)
    Object.assign(partial.a.value.bounds[0]!.value.fields[0]!, { kind: 'Unknown' })
    expect(evaluate(partial).lower_n).toMatchObject({ certain: false })
    const nullBound = structuredClone(row)
    Object.assign(nullBound.a.value.bounds[0]!, { kind: 'Null' })
    nullBound.a.value.lowerInclusive = false
    expect(evaluate(nullBound).lower_n).toEqual({ certain: true, value: null })
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
 return EvaluatePublicGateChecks(PublicGateCheckInput{A:KnownCheckValue(a),M:KnownCheckValue(m),Bag:KnownCheckValue(bag),Bypass:KnownCheckValue(skip)})}
 good=checkruntime.CopyRangeValue(good)
 before:=checkruntime.CopyRangeValue(good)
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
