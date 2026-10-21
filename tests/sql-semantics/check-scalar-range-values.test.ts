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
import {
  builtinCallables,
  builtinTypeComparison,
  builtinTypeIO,
} from '../../src/postgres/builtins/inventory.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'
import {
  scalarRangeBackends,
  scalarRangeComparison,
  scalarRangeText,
} from './check-scalar-range-fixtures.js'

it('reuses represented scalar range backends for exact bounds, constructors, relations, sets and multirange normalization across targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-range-values-'))
  try {
    for (const [index, profile] of scalarRangeBackends.entries())
      await pg.exec(
        `CREATE TYPE scalar_span_${index} AS RANGE(subtype=${profile.type},multirange_type_name=scalar_set_${index})`,
      )
    const callables = builtinCallables()
    const callable = (name: string, args?: string[]) => {
      const result = callables.find(
        (item) =>
          item.kind === 'function' &&
          item.schema === 'pg_catalog' &&
          item.name === name &&
          (!args || item.args.join(',') === args.join(',')),
      )
      if (!result || result.kind !== 'function') throw new Error('Missing native callable: ' + name)
      return result.rustName
    }
    const byteaEqual = callable('byteaeq'),
      textEqual = callable('texteq')
    const input = (value: string | null, index: number) =>
      `scalar_range_input(${value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`},${index})`
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const native = async (sql: string, parameters: unknown[]) => {
      try {
        return {
          value: (await pg.query<{ value: string | boolean | null }>(sql, parameters)).rows[0]!
            .value,
        }
      } catch (error) {
        if (
          !error ||
          typeof error !== 'object' ||
          !('code' in error) ||
          typeof error.code !== 'string'
        )
          throw error
        return { error: error.code }
      }
    }
    const wire = async (
      index: number,
      sql: string,
      parameters: unknown[],
      rust: string,
      multi = false,
      defer = false,
    ) => {
      const reference = await native(
        `SELECT encode(${multi ? 'multirange' : 'range'}_send(${sql}),'hex') value`,
        parameters,
      )
      const expected: Outcome = defer
        ? { kind: 'Unknown' }
        : reference.error
          ? { kind: 'Error', value: { state: parseInt(reference.error, 36) } }
          : { kind: reference.value === null ? 'Null' : 'True' }
      cases.push({
        rust: `${byteaEqual}(scalar_${multi ? 'multirange' : 'range'}_wire(${rust},${index}),${reference.value === null ? 'ByteaValue::Null' : `ByteaValue::Value(${rustStringLiteral(String(reference.value ?? ''))}.to_owned())`})`,
        expected,
        reference: { type: scalarRangeBackends[index]!.type, sql, parameters, ...reference, defer },
      })
    }
    const output = async (index: number, value: string | null, defer = false) => {
      const reference = await native(`SELECT $1::scalar_span_${index}::text value`, [value])
      cases.push({
        rust: `${textEqual}(range_to_text(${input(value, index)}),${reference.value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(String(reference.value ?? ''))})`})`,
        expected:
          defer && !reference.error && reference.value !== null && reference.value !== 'empty'
            ? { kind: 'Unknown' }
            : reference.error
              ? { kind: 'Error', value: { state: parseInt(reference.error, 36) } }
              : { kind: reference.value === null ? 'Null' : 'True' },
        reference: {
          type: scalarRangeBackends[index]!.type,
          output: true,
          value,
          ...reference,
          defer,
        },
      })
    }
    for (const [index, profile] of scalarRangeBackends.entries()) {
      if (profile.type === 'pg_catalog.name') continue
      const [a, b, c] = profile.values,
        span = `scalar_span_${index}`,
        multi = `scalar_set_${index}`,
        lo = scalarRangeText(a, b),
        hi = scalarRangeText(b, c)
      expect(builtinTypeComparison(profile.type)?.comparator).toBeTruthy()
      expect(builtinTypeIO(profile.type)?.send).toBeTruthy()
      for (const value of [
        null,
        'empty',
        '(,)',
        lo,
        hi,
        scalarRangeText(a, a),
        scalarRangeText(a, a, '()'),
        scalarRangeText(c, a),
        scalarRangeText(null, b),
        scalarRangeText(a, null),
        'bad',
        '[a,b,c]',
      ]) {
        await wire(index, `$1::${span}`, [value], input(value, index))
        await output(
          index,
          value,
          value !== null &&
            value !== 'empty' &&
            value !== '(,)' &&
            !['bad', '[a,b,c]'].includes(value) &&
            [15, 23, 31].includes(profile.kind),
        )
      }
      if (![21, 22, 31, 39].includes(profile.kind))
        await wire(
          index,
          `$1::${span}`,
          [scalarRangeText('bad', b)],
          input(scalarRangeText('bad', b), index),
        )
      if (profile.kind === 21 || profile.kind === 22) {
        const invalid = scalarRangeText('25:00:00+00', b)
        await wire(index, `$1::${span}`, [invalid], input(invalid, index))
        const unmodeled = scalarRangeText('bad', b)
        await wire(index, `$1::${span}`, [unmodeled], input(unmodeled, index), false, true)
      }
      for (const flags of ['[]', '[)', '(]', '()', 'bad', null]) {
        const reference = await native(
          `SELECT ${span}(lower($1::${span}),upper($1::${span}),$2)::text value`,
          [lo, flags],
        )
        await wire(
          index,
          `${span}(lower($1::${span}),upper($1::${span}),$2)`,
          [lo, flags],
          `scalar_range_construct(${input(lo, index)},${flags === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(flags)})`})`,
        )
        if (flags === 'bad') expect(reference.error).toBe('42601')
      }
      for (const [left, right] of [
        ['empty', lo],
        ['(,)', hi],
        [lo, hi],
        [lo, lo],
      ]) {
        for (const [operator, name] of [
          ['=', 'range_eq'],
          ['<', 'range_lt'],
          ['&&', 'range_overlaps'],
          ['@>', 'range_contains'],
          ['-|-', 'range_adjacent'],
        ] as const) {
          const reference = await native(`SELECT $1::${span} ${operator} $2::${span} value`, [
            left,
            right,
          ])
          cases.push({
            rust: `${callable(name, ['pg_catalog.anyrange', 'pg_catalog.anyrange'])}(${input(left!, index)},${input(right!, index)})`,
            expected: reference.error
              ? { kind: 'Error', value: { state: parseInt(reference.error, 36) } }
              : { kind: reference.value === null ? 'Null' : reference.value ? 'True' : 'False' },
            reference: { type: profile.type, left, right, operator, ...reference },
          })
        }
        for (const [operator, name] of [
          ['+', 'range_union'],
          ['*', 'range_intersect'],
          ['-', 'range_minus'],
        ] as const)
          await wire(
            index,
            `($1::${span} ${operator} $2::${span})`,
            [left, right],
            `${callable(name, ['pg_catalog.anyrange', 'pg_catalog.anyrange'])}(${input(left!, index)},${input(right!, index)})`,
          )
      }
      for (const value of [
        null,
        '{}',
        '{empty}',
        `{${hi},${lo}}`,
        `{${lo},bad}`,
        `{${lo},${scalarRangeText(c, a)}}`,
      ])
        await wire(
          index,
          `$1::${multi}`,
          [value],
          `multirange_from_text_with_support(${value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`},"public.${multi}","public.${span}",${rustStringLiteral(profile.type)},${profile.kind},make_range_support(${profile.kind},1))`,
          true,
        )
      cases.push({
        rust: `scalar_range_states(${index},${profile.kind},${rustStringLiteral(lo)})`,
        expected: { kind: 'True' },
      })
      if (profile.kind === 19 || profile.kind === 20) {
        for (const value of ['NaN', 'Infinity', '-Infinity', '0.1']) {
          const text = scalarRangeText(value, value)
          await wire(index, `$1::${span}`, [text], input(text, index), false, value === 'NaN')
          await output(index, text, value === '0.1')
          const reference = await native(`SELECT $1::${span}=$1::${span} value`, [text])
          expect(reference.value).toBe(true)
          cases.push({
            rust: `${callable('range_eq', ['pg_catalog.anyrange', 'pg_catalog.anyrange'])}(${input(text, index)},${input(text, index)})`,
            expected: { kind: 'True' },
            reference: { type: profile.type, value, semanticEquality: true },
          })
        }
        for (const value of ['0x1p0', 'NaN(payload)']) {
          const text = scalarRangeText(value, value)
          await wire(index, `$1::${span}`, [text], input(text, index), false, true)
        }
      }
      if (profile.kind === 23) {
        const left = scalarRangeText('1 mon', '1 mon'),
          right = scalarRangeText('30 days', '30 days')
        await wire(
          index,
          `($1::${span}+$2::${span})`,
          [left, right],
          `${callable('range_union', ['pg_catalog.anyrange', 'pg_catalog.anyrange'])}(${input(left, index)},${input(right, index)})`,
        )
      }
      if (profile.kind === 31) {
        for (const [lower, upper] of [
          [-100, 250],
          [250, -100],
          [250, 250],
        ])
          await wire(
            index,
            `${span}(($1::numeric/100)::money,($2::numeric/100)::money,'[]')`,
            [lower, upper],
            `range_construct_with_support("public.${span}","pg_catalog.money",31,array_element_from_money(make_money_value(${lower}i64)),array_element_from_money(make_money_value(${upper}i64)),make_text_value("[]"),make_range_support(31,1))`,
          )
      }
    }
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'scalar_range_values',
        constraint: 'probe',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=scalar_range_values_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const send = scalarRangeBackends
      .map((profile) => {
        const identity = builtinTypeIO(profile.type)!.send!,
          metadata = callables.find(
            (item) =>
              item.kind === 'function' &&
              `function:${JSON.stringify([item.schema, item.name])}(${item.args.join(',')})` ===
                identity,
          )
        if (!metadata || metadata.kind !== 'function')
          throw new Error('Missing subtype send: ' + identity)
        return `if profile==${scalarRangeBackends.indexOf(profile)} {return ${metadata.rustName}(array_element_to_${profile.prefix}(input));};`
      })
      .join('\n')
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/scalar_range_values.rs',
        source: `
fn scalar_range_input(input:TextValue,profile:i32)->RangeValue {
${scalarRangeBackends.map((p, i) => `if profile==${i} {return range_from_text_with_support(input,"public.scalar_span_${i}",${rustStringLiteral(p.type)},${p.kind},make_range_support(${scalarRangeComparison(p)},1));};`).join('\n')}
RangeValue::Unknown
}
fn scalar_range_bound_wire(input:ArrayElement,profile:i32)->ByteaValue {
${send}
ByteaValue::Unknown
}
fn scalar_range_wire(input:RangeValue,profile:i32)->ByteaValue {
 let lo=scalar_range_bound_wire(range_bound(input.clone(),false),profile);
 let hi=scalar_range_bound_wire(range_bound(input.clone(),true),profile);
 sql__pg_catalog__range_send__b1w5(input,lo,hi)
}
fn scalar_range_construct(input:RangeValue,flags:TextValue)->RangeValue {
 let lower=range_bound(input.clone(),false);
 let upper=range_bound(input.clone(),true);
 if let RangeValue::Value(value)=input {return range_construct_with_support(value.type_name.as_str(),value.element_type.as_str(),value.element_kind,lower,upper,flags,value.support);};
 input
}
fn scalar_multirange_wire(input:MultirangeValue,profile:i32)->ByteaValue {
 let state=multirange_is_null(input.clone());
 let payload=multirange_binary_payload(input);
 let count=multirange_binary_count(&payload);
 let mut result=multirange_binary_initial_send(state,count);
 let mut index=make_int4_value(0);
 while multirange_binary_continues_send(count,index,result.clone()) {
  let member=multirange_binary_member(&payload,index);
  result=multirange_binary_append(result,scalar_range_wire(member,profile));
  index=array_text_next_index(index);
 };
 result
}
fn scalar_range_states(profile:i32,kind:i32,text:&str)->BoolValue {
 let error=make_sql_error(3452582);
 if range_support_valid(make_range_support(kind,1),kind)==false{return BoolValue::Value(false);};
 if range_support_valid(make_range_support(kind,2),kind){return BoolValue::Value(false);};
 if range_is_null(scalar_range_input(TextValue::Null,profile))!=BoolValue::Value(true){return BoolValue::Value(false);};
 if range_is_null(scalar_range_input(TextValue::Unknown,profile))!=BoolValue::Unknown{return BoolValue::Value(false);};
 if range_is_null(scalar_range_input(TextValue::Error(error),profile))!=BoolValue::Error(error){return BoolValue::Value(false);};
 let original=scalar_range_input(make_text_value(text),profile);
 let saved=original.clone();
 let mut identity=String::new();
 let mut known=false;
 if let RangeValue::Value(payload)=original {
  known=true;
  identity=payload.type_name.clone();
  let lower=payload.bounds[0].clone();let upper=payload.bounds[1].clone();
  if range_is_null(range_construct_with_support(payload.type_name.as_str(),payload.element_type.as_str(),kind,lower,upper,make_text_value("[]"),make_range_support(0,1)))!=BoolValue::Unknown{return BoolValue::Value(false);};
  let failed=range_construct_with_support(payload.type_name.as_str(),payload.element_type.as_str(),kind,ArrayElement::Unknown,ArrayElement::Error(error),TextValue::Null,make_range_support(kind,1));
  if range_is_null(failed)!=BoolValue::Error(error){return BoolValue::Value(false);};
  let mut changed=payload.bounds;changed[0]=ArrayElement::Unknown;
 };
 if known==false{return BoolValue::Value(false);};
 let wire=scalar_range_wire(saved.clone(),profile);
 let mut members:Vec<ArrayElement>=Vec::new();members.push(array_element_from_range(saved));
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:-2,length:1});
 let array=make_array_value(ArrayPayload {element_type:identity,element_kind:42,dimensions,elements:members,null_bitmap:make_bool_value(false)});
 let restored=array_element_to_range(array_flat_element(array.clone(),make_int4_value(0)));
 if let RangeValue::Value(payload)=restored {let mut changed=payload.bounds;changed[0]=ArrayElement::Unknown;};
 let retained=array_element_to_range(array_flat_element(array,make_int4_value(0)));
 BoolValue::Value(scalar_range_wire(retained,profile)==wire)
}
pub fn scalar_range_values_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
${cases.map((item, index) => `if selected==${index}{return ${item.rust};};`).join('\n')}
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
    const fixtures = cases.map((item, index) => ({
      name: 'probe',
      row: { mode: { kind: 'Value' as const, value: index } },
      expected: item.expected,
    }))
    await mkdir('artifacts/scalar-range-values', { recursive: true })
    await writeFile(
      'artifacts/scalar-range-values/report.json',
      JSON.stringify(
        {
          profiles: scalarRangeBackends,
          deferredTextInputTypes: ['pg_catalog.name'],
          fixtures: fixtures.length,
          cases,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'scalarrangevalues', group, ['probe'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
