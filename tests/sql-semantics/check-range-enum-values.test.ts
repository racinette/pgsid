import { it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'

const literal = (text: string) => "'" + text.replaceAll("'", "''") + "'"

it('owns enum range label context through input, output, sets and multiranges without assuming deployment label OIDs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-range-values-'))
  try {
    const labels = ['z', 'mid', 'a', '', 'NULL', 'comma,[]', 'quote"slash\\', 'é']
    const profiles = [
      { name: 'enum', labels },
      { name: 'empty', labels: [] },
      { name: 'blank', labels: [''] },
    ]
    for (const p of profiles) {
      await pg.exec(
        `CREATE TYPE ${p.name}_label AS ENUM(${p.labels.map(literal).join(',')});CREATE TYPE ${p.name}_span AS RANGE(subtype=${p.name}_label,multirange_type_name=${p.name}_set)`,
      )
    }
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const input = (value: string | null, index = 0) =>
      `enum_span_input(${value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`},${index},6)`
    const native = async (
      sql: string,
      parameters: unknown[],
      rust: (value: string | null) => string,
      defer = false,
    ) => {
      let value: string | null = null,
        error: string | undefined
      try {
        value = (await pg.query<{ value: string | null }>(sql, parameters)).rows[0]!.value
      } catch (failure) {
        if (!failure || typeof failure !== 'object' || !('code' in failure)) throw failure
        error = String(failure.code)
      }
      cases.push({
        rust: rust(value),
        expected: error
          ? { kind: 'Error', value: { state: parseInt(error, 36) } }
          : defer && value !== null && value !== '01'
            ? { kind: 'Unknown' }
            : { kind: value === null ? 'Null' : 'True' },
        reference: { sql, parameters, value, error, defer },
      })
    }
    for (const [index, p] of profiles.entries()) {
      const spans: (string | null)[] = [
        null,
        'empty',
        '(,)',
        'bad',
        '[missing,missing]',
        ...p.labels.flatMap((label) => [
          scalarRangeText(label, label),
          scalarRangeText(label, label, '()'),
        ]),
      ]
      if (p.labels.length > 1)
        spans.push(
          scalarRangeText(p.labels[0]!, p.labels[2]!),
          scalarRangeText(p.labels[2]!, p.labels[0]!),
          scalarRangeText(null, p.labels[1]!),
          scalarRangeText(p.labels[1]!, null),
        )
      if (!p.labels.length) spans.push(scalarRangeText('', ''))
      for (const text of spans) {
        await native(
          `SELECT $1::${p.name}_span::text value`,
          [text],
          (value) =>
            `sql__pg_catalog__texteq__aet8(range_to_text(${input(text, index)}),${value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`})`,
        )
        await native(
          `SELECT encode(range_send($1::${p.name}_span),'hex') value`,
          [text],
          (value) =>
            `sql__pg_catalog__byteaeq__z0yh(enum_span_wire(${input(text, index)}),${value === null ? 'ByteaValue::Null' : `ByteaValue::Value(${rustStringLiteral(value)}.to_owned())`})`,
          /[^\x00-\x7f]/u.test(text ?? ''),
        )
        await native(
          `SELECT hash_range($1::${p.name}_span)::text value`,
          [text],
          (value) =>
            `sql__pg_catalog__int4eq__lrxe(enum_span_hash(${input(text, index)}),${value === null ? 'Int4Value::Null' : `make_int4_value(${value})`})`,
          text !== null && !['empty', '(,)'].includes(text) && !text.endsWith(')'),
        )
      }
      const values = ['empty', '(,)', ...p.labels.map((label) => scalarRangeText(label, label))]
      for (const [position, left] of values.entries())
        for (const right of [left, values[(position + 1) % values.length]!]) {
          for (const [operator, name] of [
            ['=', 'range_eq__loxq'],
            ['<', 'range_lt__t1sv'],
            ['&&', 'range_overlaps__38jd'],
            ['@>', 'range_contains__ut37'],
            ['-|-', 'range_adjacent__03u0'],
          ]) {
            const value = (
              await pg.query<{ value: boolean }>(
                `SELECT $1::${p.name}_span ${operator} $2::${p.name}_span value`,
                [left, right],
              )
            ).rows[0]!.value
            cases.push({
              rust: `sql__pg_catalog__${name}(${input(left, index)},${input(right, index)})`,
              expected: { kind: value ? 'True' : 'False' },
              reference: { type: p.name, operator, left, right, value },
            })
          }
          for (const [operator, name] of [
            ['+', 'range_union__8koj'],
            ['*', 'range_intersect__4pce'],
            ['-', 'range_minus__f67g'],
          ])
            await native(
              `SELECT ($1::${p.name}_span ${operator} $2::${p.name}_span)::text value`,
              [left, right],
              (value) =>
                `sql__pg_catalog__texteq__aet8(range_to_text(sql__pg_catalog__${name}(${input(left, index)},${input(right, index)})),make_text_value(${rustStringLiteral(value ?? '')}))`,
            )
          const multi = `{${right},empty,${left}}`
          await native(
            `SELECT $1::${p.name}_set::text value`,
            [multi],
            (value) =>
              `sql__pg_catalog__texteq__aet8(multirange_to_text(enum_multi_input(make_text_value(${rustStringLiteral(multi)}),${index})),make_text_value(${rustStringLiteral(value ?? '')}))`,
          )
          await native(
            `SELECT range_merge($1::${p.name}_set)::text value`,
            [multi],
            (value) =>
              `sql__pg_catalog__texteq__aet8(range_to_text(sql__pg_catalog__range_merge__f619(enum_multi_input(make_text_value(${rustStringLiteral(multi)}),${index}))),make_text_value(${rustStringLiteral(value ?? '')}))`,
          )
        }
    }
    for (let mode = 0; mode < 9; mode++)
      cases.push({ rust: `enum_span_invalid(${mode})`, expected: { kind: 'Unknown' } })
    cases.push(
      { rust: 'enum_span_snapshots()', expected: { kind: 'True' } },
      { rust: 'enum_span_context()', expected: { kind: 'True' } },
    )
    for (const [text, expected] of [
      [null, { kind: 'True' }],
      ['empty', { kind: 'False' }],
      ['(,)', { kind: 'False' }],
      ['[z,)', { kind: 'Unknown' }],
      ['(,z]', { kind: 'Unknown' }],
    ] as const)
      cases.push({
        rust: `range_is_null(range_from_text_defined(${text === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(text)})`},"public.enum_span","public.enum_label",6,make_range_support(6,1),"",-1))`,
        expected,
      })
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'enum_range_values',
        constraint: 'probe',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=enum_range_values_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/enum_range_values.rs',
        source: `
fn enum_span_input(input:TextValue,profile:i32,comparison:i32)->RangeValue {
${profiles.map((p, index) => `if profile==${index} {return range_from_text_defined(input,"public.${p.name}_span","public.${p.name}_label",6,make_range_support(comparison,1),${rustStringLiteral(p.labels.join('\0'))},${p.labels.length});};`).join('\n')}
RangeValue::Unknown
}
fn enum_multi_input(input:TextValue,profile:i32)->MultirangeValue {
${profiles.map((p, index) => `if profile==${index} {return multirange_from_text_defined(input,"public.${p.name}_set","public.${p.name}_span","public.${p.name}_label",6,make_range_support(6,1),${rustStringLiteral(p.labels.join('\0'))},${p.labels.length});};`).join('\n')}
MultirangeValue::Unknown
}
fn enum_span_bound_text(input:RangeValue,upper:bool)->TextValue {
 let bound=range_bound(input.clone(),upper);
 if let RangeValue::Value(value)=input {return enum_to_text(array_element_to_enum(bound),value.enum_labels.as_str(),value.enum_count);};
 if let RangeValue::Null=input {return TextValue::Null;};
 if let RangeValue::Error(error)=input {return TextValue::Error(error);};
 TextValue::Unknown
}
fn enum_span_wire(input:RangeValue)->ByteaValue {
 let lower=sql__pg_catalog__textsend__mgfj(enum_span_bound_text(input.clone(),false));
 let upper=sql__pg_catalog__textsend__mgfj(enum_span_bound_text(input.clone(),true));
 sql__pg_catalog__range_send__b1w5(input,lower,upper)
}
fn enum_span_hash(input:RangeValue)->Int4Value {
 let flags=sql__pg_catalog__hashint4__zr00(range_hash_flags(input.clone()));
 let lower=sql__pg_catalog__hashenum__z4zk(array_element_to_enum(range_bound(input.clone(),false)));
 let upper=sql__pg_catalog__hashenum__z4zk(array_element_to_enum(range_bound(input.clone(),true)));
 sql__pg_catalog__hash_range__ov3e(input,flags,lower,upper)
}
fn enum_span_invalid(mode:i32)->BoolValue {
 let source=enum_span_input(make_text_value("[z,a]"),0,6);
 if let RangeValue::Value(value)=source {
  let mut bounds=value.bounds;
  let mut labels=value.enum_labels;
  let mut count=value.enum_count;
  if mode==0 {bounds[0]=array_element_from_enum(make_enum_value(-1));};
  if mode==1 {bounds[0]=array_element_from_enum(make_enum_value(count));};
  if mode==2 {bounds[0]=ArrayElement::Enum(EnumPayload {ordinal:0,label_oid:-1i64});};
  if mode==3 {labels="duplicate\\0duplicate".to_owned();count=2;bounds[1]=array_element_from_enum(make_enum_value(1));};
  if mode==4 {count=999;};
  if mode==5 {count=0;};
  if mode==6 {count=-2;};
  if mode==7 {labels=String::new();count=-1;};
  if mode==8 {bounds[0]=ArrayElement::Enum(EnumPayload {ordinal:0,label_oid:4294967296i64});};
  let raw=RangePayload {type_name:value.type_name,element_type:value.element_type,element_kind:6,enum_labels:labels,enum_count:count,support:value.support,empty:false,lower_inclusive:true,upper_inclusive:true,bounds};
  return range_is_null(make_coerced_range_value(raw));
 };BoolValue::Value(false)
}
fn enum_span_snapshots()->BoolValue {
 let source=enum_span_input(make_text_value("[z,a]"),0,6);
 let saved=source.clone();
 let expected=range_to_text(saved.clone());
 if let RangeValue::Value(value)=source {
  let mut text=value.enum_labels;text.push('x');
  let mut bounds=value.bounds;bounds[0]=ArrayElement::Unknown;
 };
 if range_to_text(saved.clone())!=expected {return BoolValue::Value(false);};
 let multi=multirange_construct_single_with_support(saved.clone(),"public.enum_set","public.enum_span","public.enum_label",6,make_range_support(6,1));
 let restored=sql__pg_catalog__range_merge__f619(multi);
 if range_to_text(restored)!=expected {return BoolValue::Value(false);};
 let mut cells:Vec<ArrayElement>=Vec::new();cells.push(array_element_from_range(saved));
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:-2,length:1});
 let array=make_array_value(ArrayPayload {element_type:"public.enum_span".to_owned(),element_kind:42,dimensions,elements:cells,null_bitmap:make_bool_value(false)});
 let extracted=array_element_to_range(array_flat_element(array.clone(),make_int4_value(0)));
 let changed=range_with_enum_definition(extracted,"different",1);
 if range_is_null(changed)!=BoolValue::Unknown {return BoolValue::Value(false);};
 let retained=array_element_to_range(array_flat_element(array,make_int4_value(0)));
 BoolValue::Value(range_to_text(retained)==expected)
}
fn enum_span_context()->BoolValue {
 let value=enum_span_input(make_text_value("[z,a]"),0,6);
 if let RangeValue::Value(payload)=value {
  let forged=range_with_enum_definition(RangeValue::Value(payload.clone()),"first\\0other\\0last",3);
  let restored=range_from_coerced_defined_profile(forged,"public.enum_span","public.enum_label",6,6,1,${rustStringLiteral(labels.join('\0'))},${labels.length});
  if range_to_text(restored)!=range_to_text(RangeValue::Value(payload.clone())) {return BoolValue::Value(false);};
  let missing=range_with_enum_definition(RangeValue::Value(payload.clone()),payload.enum_labels.as_str(),payload.enum_count);
  let opaque=range_from_coerced_defined_profile(missing,"public.enum_span","public.enum_label",6,0,1,payload.enum_labels.as_str(),payload.enum_count);
  if sql__pg_catalog__range_eq__loxq(opaque.clone(),opaque.clone())!=BoolValue::Unknown {return BoolValue::Value(false);};
  if range_to_text(opaque)!=range_to_text(RangeValue::Value(payload.clone())) {return BoolValue::Value(false);};
  if range_is_null(enum_span_input(make_text_value("[z,a]"),0,0))!=BoolValue::Unknown {return BoolValue::Value(false);};
  let failed=enum_span_input(make_text_value("[bad,a]"),0,0);
  if range_is_null(failed)!=BoolValue::Error(make_sql_error(3484946)) {return BoolValue::Value(false);};
  let mixed=range_with_enum_definition(RangeValue::Value(payload.clone()),${rustStringLiteral(['other', ...labels.slice(1)].join('\0'))},${labels.length});
  if sql__pg_catalog__range_eq__loxq(RangeValue::Value(payload),mixed)!=BoolValue::Unknown {return BoolValue::Value(false);};
  return BoolValue::Value(true);
 };BoolValue::Value(false)
}
${Array.from(
  { length: Math.ceil(cases.length / 256) },
  (_, part) =>
    `fn enum_range_group_${part}(selected:i32)->BoolValue {\n${cases
      .slice(part * 256, (part + 1) * 256)
      .map((item, index) => `if selected==${part * 256 + index} {return ${item.rust};};`)
      .join('\n')}\nBoolValue::Unknown\n}`,
).join('\n')}
pub fn enum_range_values_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
${Array.from({ length: Math.ceil(cases.length / 256) }, (_, part) => `if selected<${(part + 1) * 256} {return enum_range_group_${part}(selected);};`).join('\n')}
 };BoolValue::Unknown
}`,
      })
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
    await mkdir('artifacts/enum-range-values', { recursive: true })
    await writeFile(
      'artifacts/enum-range-values/report.json',
      JSON.stringify({ profiles: profiles.length, fixtures: cases.length, cases }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'enumrangevalues',
      group,
      ['probe'],
      cases.map((item, mode) => ({
        name: 'probe',
        row: { mode: { kind: 'Value', value: mode } },
        expected: item.expected,
      })),
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
