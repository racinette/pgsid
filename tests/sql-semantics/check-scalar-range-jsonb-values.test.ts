import { expect, it } from 'vitest'
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

it('reuses logical JSONB bounds in owned ranges and multiranges with exact ordering, I/O, hashes, graph validation and independent snapshots', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-range-values-'))
  try {
    await pg.exec('CREATE TYPE jsonb_span AS RANGE(subtype=jsonb,multirange_type_name=jsonb_spans)')
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const input = (value: string | null) =>
      `jsonb_span_input(${value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`})`
    const native = async (sql: string, parameters: unknown[], rust: (value: string) => string) => {
      let value: string | null = null,
        error: string | undefined
      try {
        value = (await pg.query<{ value: string | null }>(sql, parameters)).rows[0]!.value
      } catch (failure) {
        if (!failure || typeof failure !== 'object' || !('code' in failure)) throw failure
        error = String(failure.code)
      }
      cases.push({
        rust: rust(value ?? ''),
        expected: error
          ? { kind: 'Error', value: { state: parseInt(error, 36) } }
          : { kind: value === null ? 'Null' : 'True' },
        reference: { sql, parameters, value, error },
      })
    }
    const scalarValues = [
      'null',
      '"a"',
      '"b"',
      '-1000000000000000000000000.00100',
      '0.00',
      '1.2300',
      'false',
      'true',
      '[]',
      '[1,null,{"a":2.00}]',
      '{}',
      '{"aa":1.00,"b":[true,null]}',
    ]
    const spans: (string | null)[] = [null, 'empty', '(,)', 'bad', '[bad,1]']
    for (const value of scalarValues) {
      spans.push(scalarRangeText(value, value), scalarRangeText(value, value, '()'))
    }
    spans.push(
      scalarRangeText('0.00', '2.000'),
      scalarRangeText('1.2300', '3.000'),
      scalarRangeText('3', '1'),
      scalarRangeText(null, 'null'),
      scalarRangeText('null', null),
      scalarRangeText('{"a":0,"a":1.00}', '{"a":2.00}'),
    )
    for (const span of spans) {
      await native(
        'SELECT $1::jsonb_span::text value',
        [span],
        (text) =>
          `sql__pg_catalog__texteq__aet8(range_to_text(${input(span)}),${span === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(text)})`})`,
      )
      await native(
        "SELECT encode(range_send($1::jsonb_span),'hex') value",
        [span],
        (text) =>
          `sql__pg_catalog__byteaeq__z0yh(jsonb_span_wire(${input(span)}),${span === null ? 'ByteaValue::Null' : `ByteaValue::Value(${rustStringLiteral(text)}.to_owned())`})`,
      )
      await native(
        'SELECT hash_range($1::jsonb_span)::text value',
        [span],
        (text) =>
          `sql__pg_catalog__int4eq__lrxe(jsonb_span_hash(${input(span)}),${span === null ? 'Int4Value::Null' : `make_int4_value(${text || '0'})`})`,
      )
      for (const seed of ['0', '-1', '9223372036854775807'])
        await native(
          'SELECT hash_range_extended($1::jsonb_span,$2::bigint)::text value',
          [span, seed],
          (text) =>
            `sql__pg_catalog__int8eq__jdhd(jsonb_span_hash_extended(${input(span)},make_int8_value(${seed}i64)),${span === null ? 'Int8Value::Null' : `make_int8_value(${text || '0'}i64)`})`,
        )
    }
    const relationSpans = [
      'empty',
      '(,)',
      ...scalarValues.map((value) => scalarRangeText(value, value)),
      scalarRangeText('0.00', '2.000'),
      scalarRangeText('1.2300', '3.000'),
    ]
    for (const [index, left] of relationSpans.entries()) {
      for (const right of [left, relationSpans[(index + 1) % relationSpans.length]!]) {
        for (const [operator, name] of [
          ['=', 'sql__pg_catalog__range_eq__loxq'],
          ['<', 'sql__pg_catalog__range_lt__t1sv'],
          ['&&', 'sql__pg_catalog__range_overlaps__38jd'],
          ['@>', 'sql__pg_catalog__range_contains__ut37'],
          ['-|-', 'sql__pg_catalog__range_adjacent__03u0'],
        ]) {
          const value = (
            await pg.query<{ value: boolean }>(
              `SELECT $1::jsonb_span ${operator} $2::jsonb_span value`,
              [left, right],
            )
          ).rows[0]!.value
          cases.push({
            rust: `${name}(${input(left)},${input(right)})`,
            expected: { kind: value ? 'True' : 'False' },
            reference: { operator, left, right, value },
          })
        }
        for (const [operator, name] of [
          ['+', 'sql__pg_catalog__range_union__8koj'],
          ['*', 'sql__pg_catalog__range_intersect__4pce'],
          ['-', 'sql__pg_catalog__range_minus__f67g'],
        ])
          await native(
            `SELECT ($1::jsonb_span ${operator} $2::jsonb_span)::text value`,
            [left, right],
            (text) =>
              `sql__pg_catalog__texteq__aet8(range_to_text(${name}(${input(left)},${input(right)})),make_text_value(${rustStringLiteral(text)}))`,
          )
        const multi = `{${right},empty,${left}}`
        await native(
          'SELECT $1::jsonb_spans::text value',
          [multi],
          (text) =>
            `sql__pg_catalog__texteq__aet8(multirange_to_text(multirange_from_text_with_support(make_text_value(${rustStringLiteral(multi)}),"public.jsonb_spans","public.jsonb_span","pg_catalog.jsonb",12,make_range_support(12,1))),make_text_value(${rustStringLiteral(text)}))`,
        )
      }
    }
    await native(
      `SELECT jsonb_span('{"a":[1.00,null],"a":true}'::jsonb,NULL,'[)')::text value`,
      [],
      (text) =>
        `sql__pg_catalog__texteq__aet8(range_to_text(jsonb_span_duplicate()),make_text_value(${rustStringLiteral(text)}))`,
    )
    for (const [lower, upper] of [
      ['"é"', '"😀"'],
      ['{"é":1.00}', '{"é":2.000}'],
      ['["é",1.2300]', '["😀",2.000]'],
    ]) {
      const constructed = `jsonb_span_utf8(make_text_value(${rustStringLiteral(lower!)}),make_text_value(${rustStringLiteral(upper!)}))`
      await native(
        "SELECT jsonb_span($1::jsonb,$2::jsonb,'[]')::text value",
        [lower, upper],
        (text) =>
          `sql__pg_catalog__texteq__aet8(range_to_text(${constructed}),make_text_value(${rustStringLiteral(text)}))`,
      )
      cases.push({
        rust: `bytea_is_null(jsonb_span_wire(${constructed}))`,
        expected: { kind: 'Unknown' },
        reference: { lower, upper, requirement: 'client encoding for non-ASCII binary send' },
      })
    }
    for (let mode = 0; mode < 10; mode++)
      cases.push({ rust: `jsonb_span_invalid(${mode})`, expected: { kind: 'Unknown' } })
    cases.push(
      { rust: 'jsonb_span_snapshots()', expected: { kind: 'True' } },
      { rust: 'jsonb_span_partial_states()', expected: { kind: 'True' } },
      {
        rust: 'range_is_null(jsonb_span_input(TextValue::Unknown))',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'range_is_null(jsonb_span_input(TextValue::Error(make_sql_error(3452582))))',
        expected: { kind: 'Error', value: { state: 3452582 } },
      },
    )
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'jsonb_range_values',
        constraint: 'probe',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=jsonb_range_values_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/jsonb_range_values.rs',
        source: `
fn jsonb_span_input(input:TextValue)->RangeValue {
 range_from_text_with_support(input,"public.jsonb_span","pg_catalog.jsonb",12,make_range_support(12,1))
}
fn jsonb_span_wire(input:RangeValue)->ByteaValue {
 let lower=sql__pg_catalog__jsonb_send__8nmo(array_element_to_jsonb(range_bound(input.clone(),false)));
 let upper=sql__pg_catalog__jsonb_send__8nmo(array_element_to_jsonb(range_bound(input.clone(),true)));
 sql__pg_catalog__range_send__b1w5(input,lower,upper)
}
fn jsonb_span_hash(input:RangeValue)->Int4Value {
 let flags=sql__pg_catalog__hashint4__zr00(range_hash_flags(input.clone()));
 let lower=sql__pg_catalog__jsonb_hash__qo2a(array_element_to_jsonb(range_bound(input.clone(),false)),1,true);
 let upper=sql__pg_catalog__jsonb_hash__qo2a(array_element_to_jsonb(range_bound(input.clone(),true)),1,true);
 sql__pg_catalog__hash_range__ov3e(input,flags,lower,upper)
}
fn jsonb_span_hash_extended(input:RangeValue,seed:Int8Value)->Int8Value {
 let flags=sql__pg_catalog__hashint4extended__xf6v(range_hash_flags(input.clone()),seed);
 let lower=sql__pg_catalog__jsonb_hash_extended__h75l(array_element_to_jsonb(range_bound(input.clone(),false)),seed,1,true);
 let upper=sql__pg_catalog__jsonb_hash_extended__h75l(array_element_to_jsonb(range_bound(input.clone(),true)),seed,1,true);
 sql__pg_catalog__hash_range_extended__axg0(input,seed,flags,lower,upper)
}
fn jsonb_span_coerced(lower:ArrayElement,upper:ArrayElement,support:RangeSupport)->RangeValue {
 let mut lower_inclusive=true;let mut upper_inclusive=true;
 let lo=lower.clone();let hi=upper.clone();
 if let ArrayElement::Null=lo {lower_inclusive=false;};
 if let ArrayElement::Null=hi {upper_inclusive=false;};
 let mut bounds:Vec<ArrayElement>=Vec::new();bounds.push(lower);bounds.push(upper);
 make_coerced_range_value(RangePayload {enum_labels:String::new(),enum_count:-1,type_name:"public.jsonb_span".to_owned(),element_type:"pg_catalog.jsonb".to_owned(),element_kind:12,support,empty:false,lower_inclusive,upper_inclusive,bounds})
}
fn jsonb_span_node(input:JsonbNode,child:usize,next:usize,end:usize,kind:i32,key_end:usize)->JsonbNode {
 JsonbNode {kind,child,next,key_start:input.key_start,key_end,text_start:input.text_start,text_end:end}
}
fn jsonb_span_changed(input:JsonbPayload,mode:i32)->JsonbPayload {
 let mut nodes=input.nodes;
 let mut characters=input.characters;
 let mut root=input.root;
 let child=nodes[root].child;
 let leaf=nodes[child].child;
 if mode==0 {root=0;};
 if mode==1 {root=nodes.len();};
 if mode==2 {let node=nodes[root];nodes[root]=jsonb_span_node(node,root,node.next,node.text_end,node.kind,node.key_end);};
 if mode==3 {let node=nodes[child];nodes[child]=jsonb_span_node(node,node.child,child,node.text_end,node.kind,node.key_end);};
 if mode==4 {let node=nodes[leaf];nodes[leaf]=jsonb_span_node(node,node.child,node.next,characters.len()+1,node.kind,node.key_end);};
 if mode==5 {let node=nodes[leaf];nodes[leaf]=jsonb_span_node(node,root,node.next,node.text_end,node.kind,node.key_end);};
 if mode==6 {let node=nodes[leaf];nodes[leaf]=jsonb_span_node(node,node.child,node.next,node.text_end,7,node.key_end);};
 if mode==7 {let node=nodes[child];nodes[child]=jsonb_span_node(node,node.child,node.next,node.text_end,node.kind,characters.len()+1);};
 if mode==8 {let position=nodes[leaf].text_start;characters[position]='x';};
 if mode==9 {let position=nodes[child].key_start;characters[position]='\\u{0000}';};
 if mode==10 {let sibling=nodes[child].next;let position=nodes[sibling].key_start;characters[position]='a';};
 JsonbPayload {characters,nodes,root}
}
fn jsonb_span_duplicate()->RangeValue {
 let parsed=make_jsonb_value("{\\"a\\":[1.00,null],\\"b\\":true}");
 if let JsonbValue::Value(value)=parsed {
  let duplicated=jsonb_span_changed(value,10);
  return jsonb_span_coerced(ArrayElement::Jsonb(duplicated),ArrayElement::Null,make_range_support(12,1));
 };RangeValue::Unknown
}
fn jsonb_span_utf8(lower:TextValue,upper:TextValue)->RangeValue {
 let lo=array_element_from_jsonb(jsonb_from_text_context(lower,true));
 let hi=array_element_from_jsonb(jsonb_from_text_context(upper,true));
 range_construct_with_support("public.jsonb_span","pg_catalog.jsonb",12,lo,hi,make_text_value("[]"),make_range_support(12,1))
}
fn jsonb_span_invalid(mode:i32)->BoolValue {
 let parsed=make_jsonb_value("{\\"a\\":[1.00,null],\\"b\\":true}");
 if let JsonbValue::Value(value)=parsed {
  let malformed=jsonb_span_changed(value,mode);
  return range_is_null(jsonb_span_coerced(ArrayElement::Jsonb(malformed),ArrayElement::Null,make_range_support(12,1)));
 };BoolValue::Value(false)
}
fn jsonb_span_snapshots()->BoolValue {
 let lower=array_element_from_jsonb(make_jsonb_value("{\\"a\\":[1.00,null]}"));
 let upper=array_element_from_jsonb(make_jsonb_value("{\\"a\\":[2.00,null]}"));
 let retained_lower=lower.clone();
 let owned=jsonb_span_coerced(lower,upper,make_range_support(12,1));
 let saved=owned.clone();
 if let ArrayElement::Jsonb(value)=retained_lower {let changed=jsonb_span_changed(value,8);
  if jsonb_is_null(jsonb_from_coerced_value(JsonbValue::Value(changed)))!=BoolValue::Unknown {return BoolValue::Value(false);};};
 let expected=range_to_text(saved.clone());
 if range_to_text(owned.clone())!=expected {return BoolValue::Value(false);};
 let multi=multirange_construct_single_with_support(owned,"public.jsonb_spans","public.jsonb_span","pg_catalog.jsonb",12,make_range_support(12,1));
 let multi_saved=multi.clone();
 let multi_text=multirange_to_text(multi.clone());
 if let MultirangeValue::Value(value)=multi {
  let mut members=value.ranges;
  let member=members[0].clone();
  let lower=range_bound(member,false);
  if let ArrayElement::Jsonb(value)=lower {
   let changed=jsonb_span_changed(value,8);
   members[0]=jsonb_span_coerced(ArrayElement::Jsonb(changed),ArrayElement::Null,make_range_support(12,1));
  };
 };
 let mut cells:Vec<ArrayElement>=Vec::new();cells.push(array_element_from_range(saved));
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:-3,length:1});
 let array=make_array_value(ArrayPayload {element_type:"public.jsonb_span".to_owned(),element_kind:42,dimensions,elements:cells,null_bitmap:make_bool_value(false)});
 let restored=array_element_to_range(array_flat_element(array.clone(),make_int4_value(0)));
 let restored_lower=range_bound(restored,false);
 if let ArrayElement::Jsonb(value)=restored_lower {let changed=jsonb_span_changed(value,8);
  if jsonb_is_null(jsonb_from_coerced_value(JsonbValue::Value(changed)))!=BoolValue::Unknown {return BoolValue::Value(false);};};
 let retained=array_element_to_range(array_flat_element(array,make_int4_value(0)));
 BoolValue::Value(range_to_text(retained)==expected && multi_text!=TextValue::Unknown && multirange_to_text(multi_saved)==multi_text)
}
fn jsonb_span_partial_states()->BoolValue {
 let source=jsonb_span_input(make_text_value("[null,null]"));
 if range_is_null(source.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
 let lower=range_bound(source.clone(),false);
 let upper=range_bound(source,true);
 if jsonb_is_null(array_element_to_jsonb(lower.clone()))!=BoolValue::Value(false) {return BoolValue::Value(false);};
 let unavailable=jsonb_span_coerced(lower,upper.clone(),make_range_support(0,1));
 if range_is_null(unavailable.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if sql__pg_catalog__range_eq__loxq(unavailable.clone(),unavailable)!=BoolValue::Unknown {return BoolValue::Value(false);};
 let partial=jsonb_span_coerced(ArrayElement::Unknown,upper,make_range_support(12,1));
 if range_is_null(partial)!=BoolValue::Value(false) {return BoolValue::Value(false);};
 let failed=jsonb_span_coerced(ArrayElement::Unknown,ArrayElement::Error(make_sql_error(3452582)),make_range_support(12,1));
 if range_is_null(failed)!=BoolValue::Error(make_sql_error(3452582)) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
${Array.from(
  { length: Math.ceil(cases.length / 256) },
  (_, part) => `fn jsonb_range_group_${part}(selected:i32)->BoolValue {
${cases
  .slice(part * 256, (part + 1) * 256)
  .map((item, index) => `if selected==${part * 256 + index} {return ${item.rust};};`)
  .join('\n')}
BoolValue::Unknown
}`,
).join('\n')}
pub fn jsonb_range_values_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
${Array.from({ length: Math.ceil(cases.length / 256) }, (_, part) => `if selected<${(part + 1) * 256} {return jsonb_range_group_${part}(selected);};`).join('\n')}
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
    expect(cases.filter((item) => item.reference).length).toBeGreaterThan(400)
    await mkdir('artifacts/jsonb-range-values', { recursive: true })
    await writeFile(
      'artifacts/jsonb-range-values/report.json',
      JSON.stringify({ fixtures: cases.length, cases }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbrangevalues',
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
