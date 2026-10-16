-- name: signed_lane_bounds
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[-2:0]={10,NULL,30}'::integer[], NULL, 1, 3, 1, -2, 0, '[-2:0]', false);
-- name: multidimensional_lanes
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1][-3:-2]={{1,NULL},{3,4}}'::integer[], NULL, 2, 4, 2, -3, -2, '[0:1][-3:-2]', false);
-- name: empty_lane_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{}'::integer[], NULL, 1, 0, NULL, NULL, NULL, NULL, false);
-- name: missing_dimension
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, 2, 2, 1, NULL, NULL, '[1:2]', false);
-- name: negative_dimension
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, -1, 2, 1, NULL, NULL, '[1:2]', false);
-- name: null_dimension
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, NULL, 2, 1, NULL, NULL, '[1:2]', false);
-- name: null_lane_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES (NULL, NULL, 1, 0, NULL, NULL, NULL, NULL, false);
-- name: standby_lane_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES (NULL, '{1,NULL}'::integer[], 1, 2, NULL, NULL, NULL, NULL, false);
-- name: selected_standby_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], '{3}'::integer[], 1, 2, 1, 1, 2, '[1:2]', true);
-- name: slot_capacity_exceeded
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,NULL,3}'::integer[], NULL, 1, 2, 1, 1, 3, '[1:3]', false);
-- name: rank_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, 1, 2, 2, 1, 2, '[1:2]', false);
-- name: lower_bound_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1]={1,2}'::integer[], NULL, 1, 2, 1, 1, 1, '[0:1]', false);
-- name: upper_bound_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1]={1,2}'::integer[], NULL, 1, 2, 1, 0, 2, '[0:1]', false);
-- name: layout_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1]={1,2}'::integer[], NULL, 1, 2, 1, 0, 1, '[1:2]', false);
-- name: standby_capacity_exceeded
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1}'::integer[], '{1,2,3}'::integer[], 1, 1, 1, 1, 1, '[1:1]', true);
-- name: nullable_capacity
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,NULL}'::integer[], NULL, 1, NULL, 1, 1, 2, '[1:2]', false);
-- name: integer_minimum_bound
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[-2147483648:-2147483648]={1}'::integer[], NULL, 1, 1, 1, -2147483648, -2147483648, '[-2147483648:-2147483648]', false);
-- name: integer_maximum_bound
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[2147483646:2147483646]={1}'::integer[], NULL, 1, 1, 1, 2147483646, 2147483646, '[2147483646:2147483646]', false);
-- name: batches_with_signed_bounds
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('[-2:-1]={1,NULL}'::integer[], '[-2:-1]={3,4}'::integer[], '[1:2][-2:-1]', 4);
-- name: nested_batches
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{{1,2},{3,4}}'::integer[], '{{5,NULL},{7,8}}'::integer[], '[1:2][1:2][1:2]', 8);
-- name: all_null_batches
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES (NULL, NULL, NULL, 0);
-- name: all_empty_batches
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{}'::integer[], '{}'::integer[], NULL, 0);
-- name: null_and_empty_batches
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES (NULL, '{}'::integer[], NULL, 0);
-- name: ragged_batch_lengths
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{1}'::integer[], '{2,3}'::integer[], NULL, 3);
-- name: different_batch_bounds
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('[0:0]={1}'::integer[], '{2}'::integer[], NULL, 2);
-- name: null_and_nonempty_batches
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES (NULL, '{2}'::integer[], NULL, 1);
-- name: empty_and_nonempty_batches
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{}'::integer[], '{2}'::integer[], NULL, 1);
-- name: mismatched_batch_layout
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{1}'::integer[], '{2}'::integer[], '[1:2]', 2);
-- name: exceeded_batch_capacity
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{1}'::integer[], '{2}'::integer[], '[1:2][1:1]', 1);
-- name: batch_rank_limit
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('{{{{{{1}}}}}}'::integer[], '{{{{{{2}}}}}}'::integer[], NULL, 2);
-- name: candidate_values
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (1, 2, 1, 3, '[1:2][1:2]', false);
-- name: candidate_null_elements
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (NULL, NULL, 0, 3, '[1:2][1:2]', false);
-- name: candidate_count_mismatch
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (1, 2, 1, 2, '[1:2][1:2]', false);
-- name: candidate_layout_mismatch
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (1, 2, 1, 3, '[1:4]', false);
-- name: candidate_division_error
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (1, 2, 0, 3, '[1:2][1:2]', false);
-- name: candidate_narrowing_error
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (32768, 2, 1, 3, '[1:2][1:2]', false);
-- name: candidate_guarded_errors
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (32768, 2, 0, 3, '[1:2][1:2]', true);

-- name: import_values
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1,2}', '{a,b}', '{yes,no}', '{1.25,2.5}', '{null}', '{(1,1),(0,0)}', 3, '[1:2]', false);

-- name: import_nested_bounds
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('[0:1][-2:-1]={{1,NULL},{3,4}}', '{a}', '{t}', '{1}', '{null}', '{(1,1),(0,0)}', 4, '[0:1][-2:-1]', false);

-- name: import_empty
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{}', '{}', '{}', '{}', '{}', '{}', 0, NULL, false);

-- name: import_null_inputs
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, false);

-- name: import_quoted_nulls
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1,NULL}', '{"NULL",NULL,"a,b"}', '{NULL,yes}', '{NULL,1}', '{null}', '{"(1,1),(0,0)";NULL}', 3, '[1:2]', false);

-- name: import_boolean_prefixes
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1}', '{a}', '{TR,of,YES,no,1,0}', '{1}', '{null}', '{(1,1),(0,0)}', 6, '[1:1]', false);

-- name: import_wrong_layout
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1,2}', NULL, NULL, NULL, NULL, NULL, 3, '[0:1]', false);

-- name: import_over_capacity
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1,2,3}', NULL, NULL, NULL, NULL, NULL, 2, '[1:3]', false);

-- name: import_integer_range
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{2147483648}', NULL, NULL, NULL, NULL, NULL, 3, NULL, false);

-- name: import_bad_integer_before_brace
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{bad,}', NULL, NULL, NULL, NULL, NULL, 3, NULL, false);

-- name: import_bad_shape
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{{1},{2,3}}', NULL, NULL, NULL, NULL, NULL, 3, NULL, false);

-- name: import_bad_boolean
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1}', NULL, '{o}', NULL, NULL, NULL, 3, '[1:1]', false);

-- name: import_numeric_precision
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1}', NULL, NULL, '{1000}', NULL, NULL, 3, '[1:1]', false);

-- name: import_numeric_input_before_precision
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1}', NULL, NULL, '{999999,bad}', NULL, NULL, 3, '[1:1]', false);

-- name: import_bad_jsonb
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1}', NULL, NULL, NULL, '{bad}', NULL, 3, '[1:1]', false);

-- name: import_bad_box
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1}', NULL, NULL, NULL, NULL, '{bad}', 3, '[1:1]', false);

-- name: import_guarded_bad_payload
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{bad}', NULL, NULL, NULL, NULL, NULL, 3, NULL, true);

-- name: import_null_fallback_exceeds_capacity
INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, false);
