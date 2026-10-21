import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'
import { readCatalogCompositeTypes } from '../../src/postgres/composite-types.js'

const pair = (a: string, b: string) =>
  `append_composite_field(append_composite_field(make_composite_fields("public.pair"),${a}),${b})`
const text = (value: string) => `ArrayElement::Text(${rustStringLiteral(value)}.to_owned())`
const span =
  'array_element_from_range(range_from_text(make_text_value("[1,3)"),"pg_catalog.int4range","pg_catalog.int4",2))'

it('owns heterogeneous composite fields and preserves PostgreSQL row NULL semantics across nested values and arrays', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-composite-values-'))
  try {
    await pg.exec(
      `CREATE TYPE pair AS (n integer,label text);CREATE TYPE wrapper AS (item pair,tag integer);CREATE TYPE bags AS (items pair[],span int4range);CREATE TYPE empty_record AS ();`,
    )
    const graph = await readCatalogCompositeTypes(pg)
    for (const identity of graph.roots) {
      const definition = graph.definitions.find((type) => type.identity === identity)!
      await pg.exec(
        `CREATE TABLE gate_${definition.name}(v ${identity},expected boolean,CHECK((v IS NULL)=expected))`,
      )
    }
    let nativeInserts = 0
    const samples = [
      { name: 'sql_null', sql: 'NULL::pair', rust: 'composite_null()', fields: 2 },
      {
        name: 'all_null',
        sql: 'ROW(NULL,NULL)::pair',
        rust: pair('ArrayElement::Null', 'ArrayElement::Null'),
        fields: 2,
      },
      {
        name: 'mixed_number',
        sql: 'ROW(1,NULL)::pair',
        rust: pair('ArrayElement::Int4(1)', 'ArrayElement::Null'),
        fields: 2,
      },
      {
        name: 'mixed_text',
        sql: "ROW(NULL,'😊')::pair",
        rust: pair('ArrayElement::Null', text('😊')),
        fields: 2,
      },
      {
        name: 'all_known',
        sql: "ROW(7,'quoted, text')::pair",
        rust: pair('ArrayElement::Int4(7)', text('quoted, text')),
        fields: 2,
      },
      {
        name: 'empty',
        sql: 'ROW()::empty_record',
        rust: 'make_composite_fields("public.empty_record")',
        fields: 0,
      },
      {
        name: 'nested_null',
        sql: 'ROW(NULL::pair,NULL)::wrapper',
        rust: 'append_composite_field(append_composite_field(make_composite_fields("public.wrapper"),ArrayElement::Null),ArrayElement::Null)',
        fields: 2,
      },
      {
        name: 'nested_present_null_fields',
        sql: 'ROW(ROW(NULL,NULL)::pair,NULL)::wrapper',
        rust: `append_composite_field(append_composite_field(make_composite_fields("public.wrapper"),array_element_from_composite(${pair('ArrayElement::Null', 'ArrayElement::Null')})),ArrayElement::Null)`,
        fields: 2,
      },
      {
        name: 'nested_present',
        sql: "ROW(ROW(1,'x')::pair,2)::wrapper",
        rust: `append_composite_field(append_composite_field(make_composite_fields("public.wrapper"),array_element_from_composite(${pair('ArrayElement::Int4(1)', text('x'))})),ArrayElement::Int4(2))`,
        fields: 2,
      },
      {
        name: 'array_and_range',
        sql: `ROW(ARRAY[ROW(NULL,NULL)::pair,NULL::pair],'empty'::int4range)::bags`,
        rust: `append_composite_field(append_composite_field(make_composite_fields("public.bags"),array_element_from_array(composite_array())),${span})`,
        fields: 2,
      },
      {
        name: 'array_null_and_range',
        sql: `ROW(NULL::pair[],'empty'::int4range)::bags`,
        rust: `append_composite_field(append_composite_field(make_composite_fields("public.bags"),ArrayElement::Null),${span})`,
        fields: 2,
      },
    ]
    const probes: { name: string; rust: string; expected: Outcome }[] = []
    for (const sample of samples) {
      const root = (
        await pg.query<{
          isnull: boolean
          notnull: boolean
          datum: boolean
          count: boolean | null
        }>(
          `SELECT v IS NULL AS "isnull",v IS NOT NULL AS "notnull",v IS NOT DISTINCT FROM NULL AS datum,(CASE WHEN v IS NOT DISTINCT FROM NULL THEN NULL ELSE (SELECT count(*) FROM json_each(to_json(v))) END)=${sample.fields} AS count FROM(SELECT ${sample.sql} v)s`,
        )
      ).rows[0]!
      expect(typeof root.isnull).toBe('boolean')
      expect(typeof root.notnull).toBe('boolean')
      for (const [name, rust, result] of [
        ['is_null', `composite_is_null(${sample.rust})`, root.isnull],
        ['is_not_null', `composite_is_not_null(${sample.rust})`, root.notnull],
        ['datum_null', `composite_datum_is_null(${sample.rust})`, root.datum],
        ['count', `composite_count_matches(${sample.rust},${sample.fields})`, root.count],
      ] as const)
        probes.push({
          name: sample.name + '_' + name,
          rust,
          expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
        })
      const row = graph.definitions.find((t) => sample.sql.endsWith('::' + t.name))
      expect(row).toBeDefined()
      expect(row!.fields).toHaveLength(sample.fields)
      for (const wrong of [false, true]) {
        const insert = pg.query(`INSERT INTO gate_${row!.name} VALUES(${sample.sql},$1)`, [
          wrong ? !root.isnull : root.isnull,
        ])
        if (wrong) await expect(insert).rejects.toMatchObject({ code: '23514' })
        else await insert
        nativeInserts++
      }
      if (sample.sql.endsWith('::pair')) {
        const result = (
          await pg.query<{ value: boolean }>(`SELECT (${sample.sql}).n IS NULL value`)
        ).rows[0]!.value
        probes.push({
          name: sample.name + '_field',
          rust: `int4_is_null(array_element_to_int4(composite_field_at(${sample.rust},make_int4_value(0))))`,
          expected: { kind: result ? 'True' : 'False' },
        })
      }
    }
    const controls: [string, string, Outcome][] = [
      ['unknown_root', 'composite_is_null(composite_unknown())', { kind: 'Unknown' }],
      [
        'unknown_field_null',
        `composite_is_null(${pair('ArrayElement::Unknown', 'ArrayElement::Null')})`,
        { kind: 'Unknown' },
      ],
      [
        'unknown_field_notnull',
        `composite_is_not_null(${pair('ArrayElement::Unknown', 'ArrayElement::Null')})`,
        { kind: 'False' },
      ],
      [
        'known_field_null',
        `composite_is_null(${pair('ArrayElement::Unknown', text('known'))})`,
        { kind: 'False' },
      ],
      [
        'known_field_notnull',
        `composite_is_not_null(${pair('ArrayElement::Unknown', text('known'))})`,
        { kind: 'Unknown' },
      ],
      [
        'unknown_selected',
        `int4_is_null(array_element_to_int4(composite_field_at(${pair('ArrayElement::Unknown', text('known'))},make_int4_value(0))))`,
        { kind: 'Unknown' },
      ],
      [
        'unrelated_selected',
        `text_is_null(array_element_to_text(composite_field_at(${pair('ArrayElement::Unknown', text('known'))},make_int4_value(1))))`,
        { kind: 'False' },
      ],
      ['empty_identity', 'composite_is_null(make_composite_fields(""))', { kind: 'Unknown' }],
      [
        'nul_identity',
        'composite_is_null(make_composite_fields("bad\\0name"))',
        { kind: 'Unknown' },
      ],
      [
        'negative_field',
        `int4_is_null(array_element_to_int4(composite_field_at(${pair('ArrayElement::Int4(1)', 'ArrayElement::Null')},make_int4_value(-1))))`,
        { kind: 'Unknown' },
      ],
      [
        'past_field',
        `int4_is_null(array_element_to_int4(composite_field_at(${pair('ArrayElement::Int4(1)', 'ArrayElement::Null')},make_int4_value(2))))`,
        { kind: 'Unknown' },
      ],
      [
        'eager_error',
        `composite_is_null(${pair('ArrayElement::Int4(1)', `ArrayElement::Error(make_sql_error(${parseInt('22003', 36)}))`)})`,
        { kind: 'Error', value: { state: parseInt('22003', 36) } },
      ],
      [
        'unknown_before_error',
        `composite_is_not_null(${pair('ArrayElement::Unknown', `ArrayElement::Error(make_sql_error(${parseInt('22012', 36)}))`)})`,
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ],
      [
        'case_error',
        `composite_is_null(composite_from_case_guard(CheckOutcome::Error(make_sql_error(${parseInt('22000', 36)}))))`,
        { kind: 'Error', value: { state: parseInt('22000', 36) } },
      ],
      [
        'case_unknown',
        'composite_is_null(composite_from_case_guard(CheckOutcome::Unknown))',
        { kind: 'Unknown' },
      ],
      ['snapshot', 'composite_snapshot()', { kind: 'True' }],
      [
        'array_roundtrip',
        'composite_is_null(array_element_to_composite(array_flat_element(composite_array(),make_int4_value(0))))',
        { kind: 'True' },
      ],
    ]
    for (const [name, rust, expected] of controls) probes.push({ name, rust, expected })
    const identity = {
        schema: 'public',
        kind: 'table' as const,
        owner: 'composite_values',
        constraint: 'valid',
      },
      entryName = checkRustEntryName(identity)
    const helperSource = `
fn composite_array()->ArrayValue {
 let child=${pair('ArrayElement::Null', 'ArrayElement::Null')};
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(array_element_from_composite(child));elements.push(ArrayElement::Null);
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension{lower:-2,length:2});
 make_array_value(ArrayPayload{element_type:"public.pair".to_owned(),element_kind:44,dimensions:dimensions,elements:elements,null_bitmap:BoolValue::Value(true)})
}
fn composite_count_matches(input:CompositeValue,count:i32)->BoolValue{
 let value=composite_field_count(input);if let Int4Value::Value(n)=value{return BoolValue::Value(n==count);};if let Int4Value::Null=value{return BoolValue::Null;};if let Int4Value::Error(e)=value{return BoolValue::Error(e);};BoolValue::Unknown
}
fn composite_snapshot()->BoolValue {
 let original=append_composite_field(make_composite_fields("public.bags"),array_element_from_array(composite_array()));let saved=original.clone();
 if let CompositeValue::Value(payload)=original {
  let cell=payload.fields[0].clone();if let ArrayElement::Array(array)=cell {let mut elements=array.elements;let first=elements[0].clone();if let ArrayElement::Composite(child)=first {let mut fields=child.fields;fields[0]=ArrayElement::Int4(99);};elements[0]=ArrayElement::Unknown;};let mut fields=payload.fields;fields[0]=ArrayElement::Null;
 };
 let array=array_element_to_array(composite_field_at(saved,make_int4_value(0)));let child=array_element_to_composite(array_flat_element(array,make_int4_value(0)));composite_is_null(child)
}
pub fn composite_probe(mode:Int4Value)->BoolValue {if let Int4Value::Value(n)=mode {${probes.map((p, i) => `if n==${i}{return ${p.rust};};`).join('\n')}};BoolValue::Unknown}
`
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=composite_probe(mode);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/composite_values.rs', source: helperSource })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    await mkdir('artifacts/composite-values', { recursive: true })
    await writeFile('artifacts/composite-values/evaluators.rs', evaluatorSource)
    await writeFile('artifacts/composite-values/helpers.rs', helperSource)
    await writeFile(
      'artifacts/composite-values/report.json',
      JSON.stringify({
        profiles: graph.roots.length,
        nativeSamples: samples.length,
        nativeInserts,
        fixtures: probes.length,
        outcomes: Object.fromEntries(
          ['True', 'False', 'Null', 'Unknown', 'Error'].map((k) => [
            k,
            probes.filter((p) => p.expected.kind === k).length,
          ]),
        ),
      }) + '\n',
    )
    expect(probes.some((p) => p.expected.kind === 'Null')).toBe(true)
    await mkdir(join(directory, 'go/checkruntime'), { recursive: true })
    await writeFile(
      join(directory, 'go/checkruntime/composite_boundary_test.go'),
      `package checkruntime
import "testing"
func TestCompositeBoundarySnapshots(t *testing.T){
 raw:=CompositeValue{Kind:CompositeValueValue,Value:CompositePayload{TypeName:"public.wrapper",Fields:[]ArrayElement{{Kind:ArrayElementComposite,Composite:CompositePayload{TypeName:"public.pair",Fields:[]ArrayElement{{Kind:ArrayElementNull},{Kind:ArrayElementNull}}}}}}}
 saved:=CompositeFromCoercedValue(raw)
 raw.Value.Fields[0].Composite.Fields[0]=ArrayElement{Kind:ArrayElementInt4,Int4:99}
 child:=CompositeFieldAt(saved,MakeInt4Value(0));if result:=CompositeIsNull(ArrayElementToComposite(child));result.Kind!=BoolValueValue||!result.Value{t.Fatal("input snapshot",result)}
 child.Composite.Fields[0]=ArrayElement{Kind:ArrayElementInt4,Int4:99}
 if result:=CompositeIsNull(ArrayElementToComposite(CompositeFieldAt(saved,MakeInt4Value(0))));result.Kind!=BoolValueValue||!result.Value{t.Fatal("field snapshot",result)}
}
`,
    )
    await runCheckParity(
      directory,
      'compositevalues',
      group,
      ['composite_values'],
      probes.map((p, i) => ({
        name: 'composite_values',
        row: { mode: { kind: 'Value', value: i } },
        expected: p.expected,
      })),
    )
    const runtime = await import(
      pathToFileURL(join(directory, 'typescript/checkruntime/runtime.ts')).href
    )
    const raw = {
      kind: 'Value',
      value: {
        typeName: 'public.wrapper',
        fields: [
          {
            kind: 'Composite',
            value: {
              typeName: 'public.pair',
              fields: [{ kind: 'Null' }, { kind: 'Null' }] as { kind: string; value?: number }[],
            },
          },
        ],
      },
    }
    const saved = runtime.compositeFromCoercedValue(raw)
    raw.value.fields[0]!.value.fields[0] = { kind: 'Int4', value: 99 }
    const child = runtime.compositeFieldAt(saved, runtime.makeInt4Value(0))
    expect(runtime.compositeIsNull(runtime.arrayElementToComposite(child))).toEqual({
      kind: 'Value',
      value: true,
    })
    child.value.fields[0] = { kind: 'Int4', value: 99 }
    expect(
      runtime.compositeIsNull(
        runtime.arrayElementToComposite(runtime.compositeFieldAt(saved, runtime.makeInt4Value(0))),
      ),
    ).toEqual({ kind: 'Value', value: true })
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
