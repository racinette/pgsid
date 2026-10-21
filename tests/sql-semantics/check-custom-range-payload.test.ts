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
import { textRangeSchema } from './check-text-range-fixtures.js'

it('uses portable captured profiles in public custom range and multirange adapters across independent catalogs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-payload-')),
    run = promisify(execFile)
  const schema =
    customRangeSchema +
    textRangeSchema +
    `
CREATE TABLE custom_text_payloads(v "Text.Range".words,w "Text.Range".words,m word_sets,items "Text.Range".words[],bypass bool,
 CONSTRAINT lower_text CHECK(CASE WHEN bypass THEN true ELSE lower(v) COLLATE "C"='a' COLLATE "C" END),
 CONSTRAINT ordered_text CHECK(CASE WHEN bypass THEN true ELSE v<w END),
 CONSTRAINT intersected_text CHECK(CASE WHEN bypass THEN true ELSE v*v=v END),
 CONSTRAINT sent_text CHECK(CASE WHEN bypass THEN true ELSE range_send(v) IS NOT NULL END),
 CONSTRAINT hashed_text CHECK(CASE WHEN bypass THEN true ELSE hash_range(v)=hash_range('[a,z]'::"Text.Range".words) END),
 CONSTRAINT multi_text CHECK(CASE WHEN bypass THEN true ELSE m::text COLLATE "C"='{[a,z]}' COLLATE "C" END),
 CONSTRAINT fetched_text CHECK(CASE WHEN bypass THEN true ELSE items[-2]=v END),
 CONSTRAINT searched_text CHECK(CASE WHEN bypass THEN true ELSE array_position(items,v)=-2 END),
 CONSTRAINT json_text CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(items)::text COLLATE "C"='["[a,z]", null, "[é,漢]"]' COLLATE "C" END));
CREATE DOMAIN saved_custom_span AS "Custom.Range".integer_span;
CREATE FUNCTION "Custom.Range".default_span(lo int4 DEFAULT 1,hi int4 DEFAULT 2,bounds text DEFAULT '[]') RETURNS "Custom.Range".integer_span AS 'range_constructor3' LANGUAGE internal IMMUTABLE;
CREATE FUNCTION "Custom.Range".default_set(item "Custom.Range".integer_span DEFAULT '[1,2]'::"Custom.Range".integer_span) RETURNS integer_set AS 'multirange_constructor1' LANGUAGE internal IMMUTABLE STRICT;
CREATE FUNCTION "Custom.Range".default_many(VARIADIC items "Custom.Range".integer_span[] DEFAULT ARRAY['[1,2]'::"Custom.Range".integer_span,'[3,4]'::"Custom.Range".integer_span]) RETURNS integer_set AS 'multirange_constructor2' LANGUAGE internal IMMUTABLE STRICT;
CREATE TABLE custom_payloads(v saved_custom_span,w "Custom.Range".integer_span,m integer_set,n integer_set,p "Custom.Range".positive_span,e "Custom.Range".positive,
 CONSTRAINT bound CHECK(lower(v)=e),CONSTRAINT adjacent CHECK(NOT(v -|- w)),
 CONSTRAINT multi CHECK(NOT(m -|- n)),CONSTRAINT nominal_element CHECK(p @> e),
 CONSTRAINT default_range CHECK("Custom.Range".default_span()=v),
 CONSTRAINT default_named_range CHECK("Custom.Range".default_span(hi=>upper(v))=v),
 CONSTRAINT default_set CHECK("Custom.Range".default_set()=m),
 CONSTRAINT constructed_range CHECK("Custom.Range".integer_span(e,upper(v),'[]')=v),
 CONSTRAINT constructed_single CHECK("Custom.Range".integer_set(v)=m),
 CONSTRAINT constructed_many CHECK("Custom.Range".integer_set(v,v)=m),
 CONSTRAINT constructed_empty CHECK(isempty("Custom.Range".integer_set())),
 CONSTRAINT rendered_range CHECK(v::text COLLATE "C"='[1,2]' COLLATE "C"),
 CONSTRAINT rendered_multirange CHECK(m::text COLLATE "C"='{[1,2]}' COLLATE "C"),
 CONSTRAINT json_range CHECK(to_jsonb(v)::text COLLATE "C"='"[1,2]"' COLLATE "C"),
 CONSTRAINT json_multirange CHECK(to_json(m)::text COLLATE "C"='"{[1,2]}"' COLLATE "C"),
 CONSTRAINT json_domain CHECK(to_jsonb(p)::text COLLATE "C"='"[1,2]"' COLLATE "C"),
 CONSTRAINT rendered_domain CHECK(p::text COLLATE "C"='[1,2]' COLLATE "C"));
CREATE TABLE custom_callbacks(v "Custom.Range".reverse_span,w "Custom.Range".reverse_span,e int4,bypass bool,
 CONSTRAINT bound CHECK(lower(v)=e),CONSTRAINT ordered CHECK(v<w),CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE v<w END),
 CONSTRAINT rendered CHECK(v::text COLLATE "C"='[4,1]' COLLATE "C"));
CREATE TABLE custom_hulls(m opaque_set,CONSTRAINT hull CHECK(isempty(range_merge(m))));
CREATE TABLE custom_imports(payload text,expected "Custom.Range".integer_span,bypass bool,
 CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE payload::"Custom.Range".integer_span IS NOT DISTINCT FROM expected END),
 CONSTRAINT called CHECK(CASE WHEN bypass THEN true ELSE "Custom.Range".integer_span(payload) IS NOT DISTINCT FROM expected END));
CREATE TABLE custom_multi_imports(payload text,expected integer_set,bypass bool,
 CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE payload::integer_set IS NOT DISTINCT FROM expected END),
 CONSTRAINT called CHECK(CASE WHEN bypass THEN true ELSE public.integer_set(payload) IS NOT DISTINCT FROM expected END));
CREATE DOMAIN custom_array_cell AS "Custom.Range".integer_span;
CREATE DOMAIN custom_windows AS "Custom.Range".integer_span[];
CREATE TABLE custom_array_payloads(windows custom_windows,typed custom_array_cell[],histories custom_windows[],head "Custom.Range".integer_span,expected_pack integer_set,bypass bool,
 CONSTRAINT counted CHECK(CASE WHEN bypass THEN true ELSE cardinality(windows)=3 END),
 CONSTRAINT fetched CHECK(CASE WHEN bypass THEN true ELSE windows[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT typed_cell CHECK(CASE WHEN bypass THEN true ELSE typed[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT history CHECK(CASE WHEN bypass THEN true ELSE (histories[1])[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT sorted CHECK(CASE WHEN bypass THEN true ELSE array_sort(windows)=windows END),
 CONSTRAINT json_windows CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(windows)::text COLLATE "C"='["[1,2]", "[1,2]", "[3,4]"]' COLLATE "C" END),
 CONSTRAINT json_history CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(histories)::text COLLATE "C"='[["[1,2]", "[1,2]", "[3,4]"]]' COLLATE "C" END),
 CONSTRAINT default_many CHECK(CASE WHEN bypass THEN true ELSE "Custom.Range".default_many() IS NOT DISTINCT FROM expected_pack END),
 CONSTRAINT packed CHECK(CASE WHEN bypass THEN true ELSE "Custom.Range".integer_set(VARIADIC windows) IS NOT DISTINCT FROM expected_pack END));
CREATE TABLE custom_multi_array_payloads(windows integer_set[],head integer_set,bypass bool,
 CONSTRAINT counted CHECK(CASE WHEN bypass THEN true ELSE cardinality(windows)=3 END),
 CONSTRAINT fetched CHECK(CASE WHEN bypass THEN true ELSE windows[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT json_sets CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(windows)::text COLLATE "C"='["{[1,2]}", "{[1,2]}", "{[3,4]}"]' COLLATE "C" END),
 CONSTRAINT sorted CHECK(CASE WHEN bypass THEN true ELSE array_sort(windows)=windows END));`
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
        executionContext: {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          nativeByteOrder: 'little',
        },
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
          executionContext: {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
            nativeByteOrder: 'little',
          },
        },
      )
      expect(alternate).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8, nativeByteOrder: little}\n    go:\n      schema: {outDir: schema}\n',
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
    for (const forge of [false, true]) {
      const support = forge ? { comparison: 8, canonical: 0 } : { comparison: 0, canonical: 0 }
      const textSpan = (lo: string, hi: string) => ({
        kind: 'Value',
        value: {
          typeName: '"Text.Range".words',
          elementType: 'pg_catalog.text',
          elementKind: 8,
          support,
          empty: false,
          lowerInclusive: true,
          upperInclusive: true,
          bounds: [
            { kind: 'Text', value: lo },
            { kind: 'Text', value: hi },
          ],
        },
      })
      const first = textSpan('a', 'z'),
        last = textSpan('é', '漢')
      const textRow = {
        v: first,
        w: last,
        m: {
          kind: 'Value',
          value: {
            typeName: 'public.word_sets',
            rangeType: '"Text.Range".words',
            elementType: 'pg_catalog.text',
            elementKind: 8,
            support,
            ranges: [first],
          },
        },
        items: {
          kind: 'Value',
          value: {
            elementType: '"Text.Range".words',
            elementKind: 42,
            dimensions: [{ lower: -2, length: 3 }],
            nullBitmap: { kind: 'Value', value: true },
            elements: [
              { kind: 'Range', value: first.value },
              { kind: 'Null' },
              { kind: 'Range', value: last.value },
            ],
          },
        },
        bypass: false,
      }
      const saved = structuredClone(textRow)
      for (const result of Object.values(
        resultMap(generated.evaluatePublicCustomTextPayloadsChecks(textRow)),
      ))
        expect(result).toEqual({ certain: true, value: true })
      expect(textRow).toEqual(saved)
      textRow.v.value.bounds[0]!.kind = 'Int4'
      expect(
        resultMap(generated.evaluatePublicCustomTextPayloadsChecks(textRow)).lower_text,
      ).toMatchObject({ certain: false })
      for (const result of Object.values(
        resultMap(generated.evaluatePublicCustomTextPayloadsChecks({ ...textRow, bypass: true })),
      ))
        expect(result).toEqual({ certain: true, value: true })
    }
    await pg.exec(
      `INSERT INTO custom_text_payloads VALUES('[a,z]','[é,漢]','{[a,z]}','[-2:0]={"[a,z]",NULL,"[é,漢]"}',false)`,
    )
    const imported = { payload: '[1,2]', expected: v, bypass: false }
    const array = {
      kind: 'Value',
      value: {
        elementType: v.value.typeName,
        elementKind: 42,
        dimensions: [{ lower: 1, length: 3 }],
        elements: [v, v, w].map((span) => ({ kind: 'Range', value: structuredClone(span.value) })),
        nullBitmap: { kind: 'Value', value: false },
      },
    }
    const arrayPack = pack('integer_set', v)
    arrayPack.value.ranges.push(w)
    const arrays = {
      windows: array,
      typed: {
        kind: 'Value',
        value: { ...structuredClone(array.value), elementType: '"public"."custom_array_cell"' },
      },
      histories: {
        kind: 'Value',
        value: {
          elementType: '"public"."custom_windows"',
          elementKind: 41,
          dimensions: [{ lower: 1, length: 1 }],
          elements: [{ kind: 'Array', value: structuredClone(array.value) }],
          nullBitmap: { kind: 'Value', value: false },
        },
      },
      head: v,
      expected_pack: arrayPack,
      bypass: false,
    }
    for (const forge of [false, true]) {
      const results = structuredClone(arrays)
      if (forge) {
        for (const cell of results.windows.value.elements)
          Object.assign(cell.value, { support: { comparison: 99, canonical: 99 } })
        for (const cell of results.typed.value.elements)
          Object.assign(cell.value, { support: { comparison: 99, canonical: 99 } })
        for (const cell of results.histories.value.elements[0]!.value.elements)
          Object.assign(cell.value, { support: { comparison: 99, canonical: 99 } })
      }
      const before = structuredClone(results)
      for (const result of Object.values(
        resultMap(generated.evaluatePublicCustomArrayPayloadsChecks(results)),
      ))
        expect(result).toEqual({ certain: true, value: true })
      expect(results).toEqual(before)
      const multiWindows = {
        ...structuredClone(array.value),
        elementType: 'public.integer_set',
        elementKind: 43,
        elements: [v, v, w].map((value) => ({
          kind: 'Multirange',
          value: structuredClone(pack('integer_set', value).value),
        })),
      }
      if (forge)
        for (const cell of multiWindows.elements) {
          Object.assign(cell.value, { support: { comparison: 99, canonical: 99 } })
          for (const member of cell.value.ranges)
            Object.assign(member.value, { support: { comparison: 99, canonical: 99 } })
        }
      const multiInput = {
          windows: { kind: 'Value', value: multiWindows },
          head: pack('integer_set', v),
          bypass: false,
        },
        multiBefore = structuredClone(multiInput)
      for (const result of Object.values(
        resultMap(generated.evaluatePublicCustomMultiArrayPayloadsChecks(multiInput)),
      ))
        expect(result).toEqual({ certain: true, value: true })
      expect(multiInput).toEqual(multiBefore)
      multiInput.windows.value.elements[0]!.value.rangeType = 'pg_catalog.int4range'
      expect(
        resultMap(generated.evaluatePublicCustomMultiArrayPayloadsChecks(multiInput)).fetched,
      ).toMatchObject({ certain: false })
      for (const result of Object.values(
        resultMap(
          generated.evaluatePublicCustomMultiArrayPayloadsChecks({ ...multiInput, bypass: true }),
        ),
      ))
        expect(result).toEqual({ certain: true, value: true })
    }
    const wrongArrays = structuredClone(arrays)
    wrongArrays.windows.value.elementType = 'pg_catalog.int4range'
    expect(
      resultMap(generated.evaluatePublicCustomArrayPayloadsChecks(wrongArrays)).counted,
    ).toMatchObject({ certain: false })
    for (const result of Object.values(
      resultMap(
        generated.evaluatePublicCustomArrayPayloadsChecks({ ...wrongArrays, bypass: true }),
      ),
    ))
      expect(result).toEqual({ certain: true, value: true })
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
    await pg.exec(
      `INSERT INTO custom_array_payloads VALUES(ARRAY['[1,2]'::"Custom.Range".integer_span,'[1,2]'::"Custom.Range".integer_span,'[3,4]'::"Custom.Range".integer_span],ARRAY['[1,2]'::custom_array_cell,'[1,2]'::custom_array_cell,'[3,4]'::custom_array_cell],ARRAY[ARRAY['[1,2]'::"Custom.Range".integer_span,'[1,2]'::"Custom.Range".integer_span,'[3,4]'::"Custom.Range".integer_span]::custom_windows],'[1,2]','{[1,2],[3,4]}',false)`,
    )
    await pg.exec(
      `INSERT INTO custom_multi_array_payloads VALUES(ARRAY['{[1,2]}'::integer_set,'{[1,2]}'::integer_set,'{[3,4]}'::integer_set],'{[1,2]}',false)`,
    )
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
import("testing";"fmt";checkruntime "custompayload/schema/public/checkrust/checkruntime";custom "custompayload/schema/schema_437573746f6d2e52616e6765")
func span(name string,lo int,hi int,element string,forge bool)checkruntime.RangeValue{
 support:=checkruntime.RangeSupport{};if forge{support=checkruntime.RangeSupport{Comparison:2,Canonical:2}}
 return checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"\\"Custom.Range\\"."+name,ElementType:element,ElementKind:2,Support:support,LowerInclusive:true,UpperInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt4,Int4:lo},{Kind:checkruntime.ArrayElementInt4,Int4:hi}}})
}
func pack(name string,value checkruntime.RangeValue)checkruntime.MultirangeValue{
 return checkruntime.MakeCoercedMultirangeValue(checkruntime.MultirangePayload{TypeName:"public."+name,RangeType:value.Value.TypeName,ElementType:value.Value.ElementType,ElementKind:2,Support:value.Value.Support,Ranges:[]checkruntime.RangeValue{value}})
}
func textSpan(lo string,hi string,comparison int)checkruntime.RangeValue{
 return checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:fmt.Sprintf("%q.%s","Text.Range","words"),ElementType:"pg_catalog.text",ElementKind:8,Support:checkruntime.MakeRangeSupport(comparison,0),LowerInclusive:true,UpperInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementText,Text:lo},{Kind:checkruntime.ArrayElementText,Text:hi}}})
}
func TestCustomProfiles(t *testing.T){
 for _,comparison:=range []int{0,8}{
  v:=textSpan("a","z",comparison);w:=textSpan("é","漢",comparison);skip:=false
  m:=checkruntime.MultirangeValue{Kind:checkruntime.MultirangeValueValue,Value:checkruntime.MultirangePayload{TypeName:"public.word_sets",RangeType:v.Value.TypeName,ElementType:"pg_catalog.text",ElementKind:8,Support:checkruntime.MakeRangeSupport(comparison,0),Ranges:[]checkruntime.RangeValue{v}}}
  items:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:v.Value.TypeName,ElementKind:42,Dimensions:[]checkruntime.ArrayDimension{{Lower:-2,Length:3}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementRange,Range:v.Value},{Kind:checkruntime.ArrayElementNull},{Kind:checkruntime.ArrayElementRange,Range:w.Value}},NullBitmap:checkruntime.MakeBoolValue(true)}}
  input:=PublicCustomTextPayloadsCheckInput{V:KnownCheckValue(v),W:KnownCheckValue(w),M:KnownCheckValue(m),Items:KnownCheckValue(items),Bypass:KnownCheckValue(&skip)}
  for _,c:=range EvaluatePublicCustomTextPayloadsChecks(input){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("text profiles",comparison,c)}}
  if v.Value.Support.Comparison!=comparison||v.Value.Support.Canonical!=0{t.Fatal("text input mutated")}
  bad:=checkruntime.CopyRangeValue(v);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementInt4,Int4:1};input.V=KnownCheckValue(bad)
  for _,c:=range EvaluatePublicCustomTextPayloadsChecks(input){if c.Constraint=="lower_text"&&c.Result.Certain{t.Fatal("malformed text bound",c)}}
  skip=true;for _,c:=range EvaluatePublicCustomTextPayloadsChecks(input){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped text input",c)}}
 }

 for _,forgeArray:=range []bool{false,true}{
  av:=span("integer_span",1,2,"pg_catalog.int4",false);bv:=span("integer_span",3,4,"pg_catalog.int4",false)
  windows:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:av.Value.TypeName,ElementKind:42,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:3}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementRange,Range:av.Value},{Kind:checkruntime.ArrayElementRange,Range:av.Value},{Kind:checkruntime.ArrayElementRange,Range:bv.Value}},NullBitmap:checkruntime.MakeBoolValue(false)}}
  if forgeArray{for i:=range windows.Value.Elements{windows.Value.Elements[i].Range.Support=checkruntime.MakeRangeSupport(99,99)}}
  typed:=checkruntime.CopyArrayValue(windows);typed.Value.ElementType=fmt.Sprintf("%q.%q","public","custom_array_cell")
  histories:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:fmt.Sprintf("%q.%q","public","custom_windows"),ElementKind:41,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:1}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementArray,Array:checkruntime.CopyArrayValue(windows).Value}},NullBitmap:checkruntime.MakeBoolValue(false)}}
  expected:=pack("integer_set",av);expected.Value.Ranges=append(expected.Value.Ranges,bv);skipArrays:=false
  inputArrays:=PublicCustomArrayPayloadsCheckInput{Windows:KnownCheckValue(windows),Typed:KnownCheckValue(typed),Histories:KnownCheckValue(histories),Head:KnownCheckValue(av),ExpectedPack:KnownCheckValue(expected),Bypass:KnownCheckValue(&skipArrays)}
  for _,c:=range EvaluatePublicCustomArrayPayloadsChecks(inputArrays){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom array",forgeArray,c)}}
  if forgeArray && windows.Value.Elements[0].Range.Support.Comparison!=99{t.Fatal("array snapshot was mutated")}
  wrong:=checkruntime.CopyArrayValue(windows);wrong.Value.ElementType="pg_catalog.int4range";inputArrays.Windows=KnownCheckValue(wrong)
  for _,c:=range EvaluatePublicCustomArrayPayloadsChecks(inputArrays){if c.Constraint=="counted"&&c.Result.Certain{t.Fatal("array identity",c)}}
  skipArrays=true;for _,c:=range EvaluatePublicCustomArrayPayloadsChecks(inputArrays){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped array",c)}}
  mv:=pack("integer_set",av);mw:=pack("integer_set",bv)
  multis:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:"public.integer_set",ElementKind:43,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:3}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementMultirange,Multirange:mv.Value},{Kind:checkruntime.ArrayElementMultirange,Multirange:mv.Value},{Kind:checkruntime.ArrayElementMultirange,Multirange:mw.Value}},NullBitmap:checkruntime.MakeBoolValue(false)}}
  if forgeArray{for i:=range multis.Value.Elements{multis.Value.Elements[i].Multirange.Support=checkruntime.MakeRangeSupport(99,99);for j:=range multis.Value.Elements[i].Multirange.Ranges{multis.Value.Elements[i].Multirange.Ranges[j].Value.Support=checkruntime.MakeRangeSupport(99,99)}}}
  skipMultis:=false;multiInput:=PublicCustomMultiArrayPayloadsCheckInput{Windows:KnownCheckValue(multis),Head:KnownCheckValue(pack("integer_set",av)),Bypass:KnownCheckValue(&skipMultis)}
  for _,c:=range EvaluatePublicCustomMultiArrayPayloadsChecks(multiInput){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom multirange array",forgeArray,c)}}
  if forgeArray&&multis.Value.Elements[0].Multirange.Support.Comparison!=99{t.Fatal("multirange array snapshot was mutated")}
  wrongMulti:=checkruntime.CopyArrayValue(multis);wrongMulti.Value.Elements[0].Multirange.RangeType="pg_catalog.int4range";multiInput.Windows=KnownCheckValue(wrongMulti)
  for _,c:=range EvaluatePublicCustomMultiArrayPayloadsChecks(multiInput){if c.Constraint=="fetched"&&c.Result.Certain{t.Fatal("multirange array member identity",c)}}
  skipMultis=true;for _,c:=range EvaluatePublicCustomMultiArrayPayloadsChecks(multiInput){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped multirange array",c)}}
 }
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
