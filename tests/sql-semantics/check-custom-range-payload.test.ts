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
import { customRangeSchema } from './check-custom-range-fixtures.js'

it('uses portable captured profiles in public custom range and multirange adapters across independent catalogs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-payload-')),
    run = promisify(execFile)
  const schema =
    customRangeSchema +
    `
CREATE DOMAIN saved_custom_span AS "Custom.Range".integer_span;
CREATE TABLE custom_payloads(v saved_custom_span,w "Custom.Range".integer_span,m integer_set,n integer_set,p "Custom.Range".positive_span,e "Custom.Range".positive,
 CONSTRAINT bound CHECK(lower(v)=e),CONSTRAINT adjacent CHECK(NOT(v -|- w)),
 CONSTRAINT multi CHECK(NOT(m -|- n)),CONSTRAINT nominal_element CHECK(p @> e),
 CONSTRAINT rendered_range CHECK(v::text COLLATE "C"='[1,2]' COLLATE "C"),
 CONSTRAINT rendered_multirange CHECK(m::text COLLATE "C"='{[1,2]}' COLLATE "C"),
 CONSTRAINT rendered_domain CHECK(p::text COLLATE "C"='[1,2]' COLLATE "C"));
CREATE TABLE custom_callbacks(v "Custom.Range".reverse_span,w "Custom.Range".reverse_span,e int4,bypass bool,
 CONSTRAINT bound CHECK(lower(v)=e),CONSTRAINT ordered CHECK(v<w),CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE v<w END),
 CONSTRAINT rendered CHECK(v::text COLLATE "C"='[4,1]' COLLATE "C"));
CREATE TABLE custom_hulls(m opaque_set,CONSTRAINT hull CHECK(isempty(range_merge(m))));
CREATE TABLE custom_imports(payload text,expected "Custom.Range".integer_span,bypass bool,
 CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE payload::"Custom.Range".integer_span IS NOT DISTINCT FROM expected END));
CREATE TABLE custom_multi_imports(payload text,expected integer_set,bypass bool,
 CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE payload::integer_set IS NOT DISTINCT FROM expected END));`
  try {
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg)
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      {
        enums: catalog.enums,
        rangeTypes: catalog.rangeTypes,
      },
    )
    const shifted = await PGlite.create()
    try {
      await shifted.exec('CREATE TABLE discarded_slots(value text);DROP TABLE discarded_slots;')
      await shifted.exec(schema)
      const other = await snapshotCatalog(shifted)
      expect(other.domains.find((domain) => domain.name === 'positive')!.oid).not.toBe(
        catalog.domains.find((domain) => domain.name === 'positive')!.oid,
      )
      const alternate = renderTypescriptSchemaCheckArtifacts(
        other.tables,
        other.domains,
        other.domains,
        {
          enums: other.enums,
          rangeTypes: other.rangeTypes,
        },
      )
      expect(alternate).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'custompayload/schema',
    )
    expect(go.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    for (const artifact of go.artifacts) {
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
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const resultMap = (results: { constraint: string; result: Result }[]): Record<string, Result> =>
      Object.fromEntries(results.map((result) => [result.constraint, result.result]))
    const span = (name: string, lower: number, upper: number, elementType = 'pg_catalog.int4') => ({
      kind: 'Value',
      value: {
        typeName: '"Custom.Range".' + name,
        elementType,
        elementKind: 2,
        empty: false,
        lowerInclusive: true,
        upperInclusive: true,
        bounds: [
          { kind: 'Int4', value: lower },
          { kind: 'Int4', value: upper },
        ],
      },
    })
    const pack = (type: string, member: ReturnType<typeof span>) => ({
      kind: 'Value',
      value: {
        typeName: 'public.' + type,
        rangeType: member.value.typeName,
        elementType: member.value.elementType,
        elementKind: 2,
        ranges: [member],
      },
    })
    const v = span('integer_span', 1, 2),
      w = span('integer_span', 3, 4)
    const row = {
      v,
      w,
      m: pack('integer_set', v),
      n: pack('integer_set', w),
      p: span('positive_span', 1, 2, '"Custom.Range".positive'),
      e: 1,
    }
    const imported = { payload: '[1,2]', expected: v, bypass: false }
    expect(resultMap(generated.evaluatePublicCustomImportsChecks(imported)).parsed).toEqual({
      certain: true,
      value: true,
    })
    expect(
      resultMap(generated.evaluatePublicCustomImportsChecks({ ...imported, payload: '[1,3]' }))
        .parsed,
    ).toEqual({ certain: true, value: false })
    expect(
      resultMap(generated.evaluatePublicCustomImportsChecks({ ...imported, payload: '[bad,3]' }))
        .parsed,
    ).toMatchObject({ certain: true, error: '22P02' })
    expect(
      resultMap(
        generated.evaluatePublicCustomImportsChecks({
          ...imported,
          payload: '[bad,3]',
          bypass: true,
        }),
      ).parsed,
    ).toEqual({ certain: true, value: true })
    const multiImported = { payload: '{[1,2]}', expected: pack('integer_set', v), bypass: false }
    for (const [payload, bypass, expected] of [
      ['{[1,2]}', false, { certain: true, value: true }],
      ['{[1,3]}', false, { certain: true, value: false }],
      ['{[bad,3]}', false, { certain: true, error: '22P02' }],
      ['{[bad,3]}', true, { certain: true, value: true }],
    ] as const)
      expect(
        resultMap(
          generated.evaluatePublicCustomMultiImportsChecks({ ...multiImported, payload, bypass }),
        ).parsed,
      ).toMatchObject(expected)
    for (const result of Object.values(
      resultMap(generated.evaluatePublicCustomPayloadsChecks(row)),
    ))
      expect(result).toEqual({ certain: true, value: true })
    const forged = structuredClone(row)
    for (const payload of [
      forged.v.value,
      forged.w.value,
      forged.p.value,
      forged.m.value,
      forged.n.value,
      ...forged.m.value.ranges.map((member) => member.value),
      ...forged.n.value.ranges.map((member) => member.value),
    ])
      Object.assign(payload, { support: { comparison: 2, canonical: 2 } })
    for (const result of Object.values(
      resultMap(generated.evaluatePublicCustomPayloadsChecks(forged)),
    ))
      expect(result).toEqual({ certain: true, value: true })
    expect(resultMap(generated.evaluatePublicCustomPayloadsChecks({ ...row, e: 2 })).bound).toEqual(
      { certain: true, value: false },
    )
    expect(
      resultMap(
        generated.evaluatePublicCustomPayloadsChecks({ ...row, v: span('positive_span', 1, 2) }),
      ).bound,
    ).toMatchObject({ certain: false })
    const partial = structuredClone(row)
    Object.assign(partial.v.value, { bounds: [{ kind: 'Unknown' }, { kind: 'Int4', value: 2 }] })
    expect(resultMap(generated.evaluatePublicCustomPayloadsChecks(partial)).bound).toMatchObject({
      certain: false,
    })
    const callbacks = resultMap(
      generated.evaluatePublicCustomCallbacksChecks({
        v: span('reverse_span', 4, 1),
        w: span('reverse_span', 3, 1),
        e: 4,
        bypass: true,
      }),
    )
    expect(callbacks.bound).toEqual({ certain: true, value: true })
    expect(callbacks.ordered).toMatchObject({ certain: false })
    expect(callbacks.guarded).toEqual({ certain: true, value: true })
    expect(callbacks.rendered).toEqual({ certain: true, value: true })
    const opaque = pack('opaque_set', span('opaque_span', 1, 2))
    opaque.value.ranges.push(span('opaque_span', 5, 6))
    expect(resultMap(generated.evaluatePublicCustomHullsChecks({ m: opaque })).hull).toMatchObject({
      certain: false,
    })
    await pg.exec(
      `INSERT INTO custom_payloads VALUES('[1,2]','[3,4]','{[1,2]}','{[3,4]}','[1,2]',1)`,
    )
    await expect(
      pg.exec(`INSERT INTO custom_payloads VALUES('[1,2]','[3,4]','{[1,2]}','{[3,4]}','[1,2]',2)`),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(pg.exec(`INSERT INTO custom_hulls VALUES('{[1,2],[5,6]}')`)).rejects.toMatchObject(
      { code: '22000' },
    )
    await pg.exec(`INSERT INTO custom_multi_imports VALUES('{[1,2]}','{[1,2]}',false)`)
    await expect(
      pg.exec(`INSERT INTO custom_multi_imports VALUES('{[1,3]}','{[1,2]}',false)`),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(
      pg.exec(`INSERT INTO custom_multi_imports VALUES('{[bad,3]}','{[1,2]}',false)`),
    ).rejects.toMatchObject({ code: '22P02' })
    await writeFile(join(root, 'go.mod'), 'module custompayload\n\ngo 1.25\n')
    await writeFile(
      join(root, 'schema/public/custom_test.go'),
      `package public
import("testing";checkruntime "custompayload/schema/public/checkrust/checkruntime";custom "custompayload/schema/schema_437573746f6d2e52616e6765")
func span(name string,lo int,hi int,element string,forge bool)checkruntime.RangeValue{
 support:=checkruntime.RangeSupport{};if forge{support=checkruntime.RangeSupport{Comparison:2,Canonical:2}}
 return checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"\\"Custom.Range\\"."+name,ElementType:element,ElementKind:2,Support:support,LowerInclusive:true,UpperInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt4,Int4:lo},{Kind:checkruntime.ArrayElementInt4,Int4:hi}}})
}
func pack(name string,value checkruntime.RangeValue)checkruntime.MultirangeValue{
 return checkruntime.MakeCoercedMultirangeValue(checkruntime.MultirangePayload{TypeName:"public."+name,RangeType:value.Value.TypeName,ElementType:value.Value.ElementType,ElementKind:2,Support:value.Value.Support,Ranges:[]checkruntime.RangeValue{value}})
}
func TestCustomProfiles(t *testing.T){
 for _,forge:=range []bool{false,true}{
  v:=span("integer_span",1,2,"pg_catalog.int4",forge);w:=span("integer_span",3,4,"pg_catalog.int4",forge);e:=custom.Positive(1)
  input:=PublicCustomPayloadsCheckInput{V:KnownCheckValue(v),W:KnownCheckValue(w),M:KnownCheckValue(pack("integer_set",v)),N:KnownCheckValue(pack("integer_set",w)),P:KnownCheckValue(span("positive_span",1,2,"\\"Custom.Range\\".positive",forge)),E:KnownCheckValue(&e)}
  for _,c:=range EvaluatePublicCustomPayloadsChecks(input){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("captured support",forge,c)}}
  bad:=v;bad.Value.TypeName="pg_catalog.int4range";input.V=KnownCheckValue(bad)
  for _,c:=range EvaluatePublicCustomPayloadsChecks(input){if c.Constraint=="bound"&&c.Result.Certain{t.Fatal("nominal identity",c)}}
 }
 payload:="[1,2]";skip:=false;expectedRange:=span("integer_span",1,2,"pg_catalog.int4",false)
 imported:=PublicCustomImportsCheckInput{Payload:KnownCheckValue(&payload),Expected:KnownCheckValue(expectedRange),Bypass:KnownCheckValue(&skip)}
 for _,c:=range EvaluatePublicCustomImportsChecks(imported){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom input",c)}}
 payload="[bad,3]";for _,c:=range EvaluatePublicCustomImportsChecks(imported){if !c.Result.Certain||c.Result.Value.Error!="22P02"{t.Fatal("input error",c)}}
 skip=true;for _,c:=range EvaluatePublicCustomImportsChecks(imported){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped input",c)}}
 payload="{[1,2]}";skip=false
 multiImported:=PublicCustomMultiImportsCheckInput{Payload:KnownCheckValue(&payload),Expected:KnownCheckValue(pack("integer_set",expectedRange)),Bypass:KnownCheckValue(&skip)}
 for _,c:=range EvaluatePublicCustomMultiImportsChecks(multiImported){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom multirange input",c)}}
 payload="{[bad,3]}";for _,c:=range EvaluatePublicCustomMultiImportsChecks(multiImported){if !c.Result.Certain||c.Result.Value.Error!="22P02"{t.Fatal("multirange input error",c)}}
 skip=true;for _,c:=range EvaluatePublicCustomMultiImportsChecks(multiImported){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped multirange input",c)}}
 e:=int32(4);bypass:=true
 reverse:=PublicCustomCallbacksCheckInput{V:KnownCheckValue(span("reverse_span",4,1,"pg_catalog.int4",true)),W:KnownCheckValue(span("reverse_span",3,1,"pg_catalog.int4",true)),E:KnownCheckValue(&e),Bypass:KnownCheckValue(&bypass)}
 for _,c:=range EvaluatePublicCustomCallbacksChecks(reverse){if c.Constraint=="ordered"{if c.Result.Certain{t.Fatal("unavailable comparator",c)}}else if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("callback independent",c)}}
 opaque:=pack("opaque_set",span("opaque_span",1,2,"pg_catalog.int4",false));opaque.Value.Ranges=append(opaque.Value.Ranges,span("opaque_span",5,6,"pg_catalog.int4",false))
 for _,c:=range EvaluatePublicCustomHullsChecks(PublicCustomHullsCheckInput{M:KnownCheckValue(opaque)}){if c.Result.Certain{t.Fatal("unavailable canonicalizer",c)}}
}
`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
