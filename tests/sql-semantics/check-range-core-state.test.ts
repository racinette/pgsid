import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'

it('retains owned partial range results, reached bounds and strict argument-error order without catalog assumptions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-core-state-'))
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'range_core',
      constraint: 'partial_owned',
    })
    const evaluatorSource = `pub fn ${entry}() -> CheckOutcome { let result = range_core_state_probe(); check_from_bool(result) }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/range_core_state.rs',
        source: `
fn range_core_state_span(lower: ArrayElement, upper: ArrayElement) -> RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range", "pg_catalog.int4", 2, false, true, false, lower, upper)
}
pub fn range_core_state_probe() -> BoolValue {
 let partial = range_core_state_span(ArrayElement::Unknown, ArrayElement::Int4(3));
 let right = range_core_state_span(ArrayElement::Int4(5), ArrayElement::Int4(8));
 let empty = range_from_text(make_text_value("empty"), "pg_catalog.int4range", "pg_catalog.int4", 2);
 let unbounded = range_from_text(make_text_value("(,)"), "pg_catalog.int4range", "pg_catalog.int4", 2);
 if sql__pg_catalog__range_cmp__8jgl(empty.clone(), partial.clone()) != make_int4_value(-1) { return BoolValue::Value(false); };
 if sql__pg_catalog__range_before__z0g8(partial.clone(), right.clone()) != BoolValue::Value(true) { return BoolValue::Value(false); };
 if sql__pg_catalog__range_after__5pak(partial.clone(), right.clone()) != BoolValue::Unknown { return BoolValue::Value(false); };
 if sql__pg_catalog__range_contains__ut37(partial.clone(), empty.clone()) != BoolValue::Value(true) { return BoolValue::Value(false); };
 let intersection = sql__pg_catalog__range_intersect__4pce(empty.clone(), partial.clone());
 if range_empty_state(intersection) != BoolValue::Value(true) { return BoolValue::Value(false); };
 let copied = sql__pg_catalog__range_union__8koj(empty.clone(), partial.clone());
 if array_element_to_int4(range_bound(copied.clone(), true)) != make_int4_value(3) { return BoolValue::Value(false); };
 if array_element_to_int4(range_bound(copied.clone(), false)) != Int4Value::Unknown { return BoolValue::Value(false); };
 let merged = sql__pg_catalog__range_merge__b43r(unbounded.clone(), partial.clone());
 if range_to_text(merged) != make_text_value("(,)") { return BoolValue::Value(false); };
 let union = sql__pg_catalog__range_union__8koj(unbounded, partial.clone());
 if range_to_text(union) != make_text_value("(,)") { return BoolValue::Value(false); };
 if sql__pg_catalog__range_contains_elem__wtfe(empty, ArrayElement::Unknown) != BoolValue::Unknown { return BoolValue::Value(false); };
 let first = make_sql_error(${parseInt('22012', 36)});
 let second = make_sql_error(${parseInt('22003', 36)});
 if sql__pg_catalog__range_contained_by__ok2x(RangeValue::Error(first), RangeValue::Error(second)) != BoolValue::Error(first) { return BoolValue::Value(false); };
 if sql__pg_catalog__range_contains_elem__wtfe(RangeValue::Error(first), ArrayElement::Error(second)) != BoolValue::Error(first) { return BoolValue::Value(false); };
 if sql__pg_catalog__elem_contained_by_range__wkbk(ArrayElement::Error(second), RangeValue::Error(first)) != BoolValue::Error(second) { return BoolValue::Value(false); };
 let original = range_core_state_span(ArrayElement::Int4(1), ArrayElement::Int4(3));
 let result = sql__pg_catalog__range_merge__b43r(original.clone(), right);
 if let RangeValue::Value(payload) = result {
   let mut cells = payload.bounds;
   cells[0] = ArrayElement::Int4(99);
   let changed = range_from_coerced_bounds("pg_catalog.int4range", "pg_catalog.int4", 2, false, true, false, cells[0].clone(), cells[1].clone());
   if range_to_text(changed) != make_text_value("[99,8)") { return BoolValue::Value(false); };
 };
 if range_to_text(original) != make_text_value("[1,3)") { return BoolValue::Value(false); };
 if array_element_to_int4(range_bound(partial, true)) != make_int4_value(3) { return BoolValue::Value(false); };
 if array_element_to_int4(range_bound(copied, true)) != make_int4_value(3) { return BoolValue::Value(false); };
 BoolValue::Value(true)
}`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [{ kind: 'supported', entryName: entry, inputs: [] }],
    }
    await runCheckParity(
      directory,
      'rangecorestate',
      group,
      ['states'],
      [{ name: 'states', row: {}, expected: { kind: 'True' } }],
    )
    expect(source.modules.some((m) => m.name === 'regex_engine')).toBe(false)
    await mkdir('artifacts/check-range-core', { recursive: true })
    await writeFile(
      'artifacts/check-range-core/state-report.json',
      JSON.stringify(
        {
          fixtures: 1,
          ownedSnapshots: true,
          partialBoundRecovery: true,
          containsElementErrorOrder: true,
          regexDependency: false,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
