import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('compares admitted JSONB root facts against native witnesses without assuming contents or duplicate-sensitive containment', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-partial-relations-'))
  const names = ['equal', 'contains', 'compare']
  const entries = names.map((constraint) =>
    checkRustEntryName({ schema: 'public', kind: 'table', owner: 'root_facts', constraint }),
  )
  const inputs = [
    { name: 'lhs', rustName: 'lhs', rustType: 'JsonbValue', type: 'pg_catalog.jsonb' },
    { name: 'rhs', rustName: 'rhs', rustType: 'JsonbValue', type: 'pg_catalog.jsonb' },
    { name: 'left_mode', rustName: 'left_mode', rustType: 'Int4Value', type: 'pg_catalog.int4' },
    { name: 'right_mode', rustName: 'right_mode', rustType: 'Int4Value', type: 'pg_catalog.int4' },
    { name: 'expected', rustName: 'expected', rustType: 'Int4Value', type: 'pg_catalog.int4' },
  ]
  const signature = inputs.map((input) => `${input.rustName}:${input.rustType}`).join(',')
  const argumentsText = inputs.map((input) => input.rustName).join(',')
  const evaluatorSource = entries
    .map(
      (entry, index) =>
        `pub fn ${entry}(${signature})->CheckOutcome { jsonb_root_probe_${names[index]}(${argumentsText}) }`,
    )
    .join('\n')
  const helper = `
fn jsonb_root_probe_value(input:JsonbValue,mode:Int4Value)->JsonbValue {
 if let JsonbValue::Value(_) = input {
  if let Int4Value::Value(setting) = mode {
   if setting>0 {
    let facts=jsonb_root_facts(input,false);
    let mut kind=facts.kind;
    let mut length=facts.length;
    if setting>=2 { length=-1; };
    if setting>=3 { kind=-1; };
    return jsonb_partial_shape(1024i64,kind,length);
   };
  };
 };
 input
}
pub fn jsonb_root_probe_equal(${signature})->CheckOutcome {
 let left=jsonb_root_probe_value(lhs,left_mode);
 let right=jsonb_root_probe_value(rhs,right_mode);
 let result=sql__pg_catalog__jsonb_eq__tfah(left,right);
 check_from_bool(result)
}
pub fn jsonb_root_probe_contains(${signature})->CheckOutcome {
 let left=jsonb_root_probe_value(lhs,left_mode);
 let right=jsonb_root_probe_value(rhs,right_mode);
 let result=sql__pg_catalog__jsonb_contains__x4n2(left,right);
 check_from_bool(result)
}
pub fn jsonb_root_probe_compare(${signature})->CheckOutcome {
 let left=jsonb_root_probe_value(lhs,left_mode);
 let right=jsonb_root_probe_value(rhs,right_mode);
 let result=sql__pg_catalog__jsonb_cmp__n2cx(left,right);
 let equal=sql__pg_catalog__int4eq__lrxe(result,expected);
 check_from_bool(equal)
}`
  const source = assembleCheckRust({
    source: evaluatorSource,
    callables: [
      'sql__pg_catalog__jsonb_eq__tfah',
      'sql__pg_catalog__jsonb_contains__x4n2',
      'sql__pg_catalog__jsonb_cmp__n2cx',
      'sql__pg_catalog__int4eq__lrxe',
    ],
  })
  source.modules
    .find((module) => module.name === 'pg_catalog')!
    .files.push({ path: 'test/jsonb_root_probes.rs', source: helper })
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    source,
    evaluatorSource,
    requiresRegex: false,
    checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
  }
  const samples = {
    null: ['null'],
    false: ['false'],
    true: ['true'],
    number: ['0', '1.5', '-99'],
    string: ['""', '"a"', '"z"'],
    empty: ['[]'],
    single: ['[null]', '[1]', '[{}]'],
    double: ['[null,null]', '[1,1]', '[{},[]]'],
    object_empty: ['{}'],
    object_single: ['{"a":1}', '{"b":null}'],
    object_double: ['{"a":1,"b":2}', '{"x":null,"y":[]}'],
  }
  type Sample = keyof typeof samples
  type Verdict = boolean | undefined
  const cases: [Sample, Sample, Verdict, Verdict, number | undefined, number?, number?][] = [
    ['single', 'object_single', false, false, -1],
    ['object_single', 'single', false, false, 1],
    ['empty', 'null', false, false, -1],
    ['null', 'empty', false, false, 1],
    ['single', 'null', false, undefined, 1],
    ['null', 'single', false, false, -1],
    ['empty', 'null', false, undefined, undefined, 2],
    ['single', 'null', false, undefined, undefined, 2],
    ['empty', 'empty', undefined, undefined, undefined, 3],
    ['single', 'double', false, undefined, -1],
    ['double', 'single', false, undefined, 1],
    ['empty', 'empty', true, true, 0],
    ['empty', 'single', false, false, -1],
    ['single', 'empty', false, true, 1],
    ['object_empty', 'object_single', false, false, -1],
    ['object_single', 'object_empty', false, true, 1],
    ['object_single', 'object_double', false, false, -1],
    ['object_double', 'object_single', false, undefined, 1],
    ['object_single', 'object_single', undefined, undefined, undefined],
    ['single', 'single', undefined, undefined, undefined],
    ['null', 'null', true, true, 0],
    ['false', 'false', true, true, 0],
    ['true', 'true', true, true, 0],
    ['false', 'true', false, false, -1],
    ['true', 'false', false, false, 1],
    ['number', 'string', false, false, 1],
    ['number', 'number', undefined, undefined, undefined],
    ['string', 'string', undefined, undefined, undefined],
    ['empty', 'false', false, false, -1, 0],
    ['false', 'empty', false, false, 1, 1, 0],
  ]
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  try {
    for (const [a, b, equal, contains, compared, leftMode = 1, rightMode = 1] of cases)
      for (const lhs of samples[a])
        for (const rhs of samples[b]) {
          const native = (
            await pg.query<{ equal: boolean; contained: boolean; compared: number }>(
              'SELECT lhs=rhs AS equal,lhs @> rhs AS contained,jsonb_cmp(lhs,rhs) AS compared FROM (SELECT $1::jsonb lhs,$2::jsonb rhs) args',
              [lhs, rhs],
            )
          ).rows[0]!
          if (equal !== undefined) expect(native.equal, `${lhs} = ${rhs}`).toBe(equal)
          if (contains !== undefined) expect(native.contained, `${lhs} @> ${rhs}`).toBe(contains)
          if (compared !== undefined) expect(native.compared, `${lhs} cmp ${rhs}`).toBe(compared)
          const row: Row = {
            lhs: value(lhs),
            rhs: value(rhs),
            left_mode: value(leftMode),
            right_mode: value(rightMode),
            expected: value(native.compared),
          }
          for (const [index, result] of [
            equal,
            contains,
            compared === undefined ? undefined : true,
          ].entries())
            fixtures.push({
              name: names[index]!,
              row,
              expected: { kind: result === undefined ? 'Unknown' : result ? 'True' : 'False' },
            })
        }
    await runCheckParity(directory, 'pgsid-jsonb-root-facts', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
