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

-- name: export_nested_bounds
INSERT INTO lane_exports (slots, labels, flags, amounts, documents, expected_slots, expected_labels, expected_flags, expected_amounts, expected_documents, bypass)
VALUES ('[0:1][-2:-1]={{1,NULL},{3,4}}', '{"NULL","a,b"}', '{t,f,NULL}', '{1.2300,NULL}', '{"{\"a\":1}",NULL}', '[0:1][-2:-1]={{1,NULL},{3,4}}', '{"NULL","a,b"}', '{t,f,NULL}', '{1.2300,NULL}', '{"{\"a\": 1}",NULL}', false);

-- name: export_empty_arrays
INSERT INTO lane_exports (slots, labels, flags, amounts, documents, expected_slots, expected_labels, expected_flags, expected_amounts, expected_documents, bypass)
VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', false);

-- name: export_null_arrays
INSERT INTO lane_exports (slots, labels, flags, amounts, documents, expected_slots, expected_labels, expected_flags, expected_amounts, expected_documents, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);

-- name: export_null_cells
INSERT INTO lane_exports (slots, labels, flags, amounts, documents, expected_slots, expected_labels, expected_flags, expected_amounts, expected_documents, bypass)
VALUES ('{NULL}', '{NULL}', '{NULL}', '{NULL}', '{NULL}', '{NULL}', '{NULL}', '{NULL}', '{NULL}', '{NULL}', false);

-- name: export_escaped_labels
INSERT INTO lane_exports (labels, expected_labels)
VALUES ('{"","null","a\"b","a\\b","x
y",雪😊}', '{"","null","a\"b","a\\b","x
y",雪😊}');

-- name: export_wrong_slots
INSERT INTO lane_exports (slots, expected_slots) VALUES ('[0:1]={1,2}', '{1,2}');

-- name: export_wrong_labels
INSERT INTO lane_exports (labels, expected_labels) VALUES ('{"NULL"}', '{NULL}');

-- name: export_wrong_flags
INSERT INTO lane_exports (flags, expected_flags) VALUES ('{t,f}', '{true,false}');

-- name: export_wrong_numeric_scale
INSERT INTO lane_exports (amounts, expected_amounts) VALUES ('{1.2300}', '{1.23}');

-- name: export_wrong_jsonb_spacing
INSERT INTO lane_exports (documents, expected_documents) VALUES ('{"{\"a\":1}"}', '{"{\"a\":1}"}');

-- name: export_guarded_slots
INSERT INTO lane_exports (slots, expected_slots, bypass) VALUES ('{1,2}', 'wrong', true);

-- name: export_json_null_and_sql_null
INSERT INTO lane_exports (documents, expected_documents) VALUES ('{"null",NULL}', '{"null",NULL}');

-- name: export_exact_numeric_values
INSERT INTO lane_exports (amounts, expected_amounts)
VALUES ('{12345678901234567890.0012300,NaN,Infinity,-Infinity,0.00}', '{12345678901234567890.0012300,NaN,Infinity,-Infinity,0.00}');

-- name: selection_shifted_bounds
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, 0, 1, 10, NULL, '{10,NULL}', 1, false);

-- name: selection_null_cell
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 1, 0, 1, 1, NULL, NULL, '{NULL}', 1, false);

-- name: selection_nested_lanes
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:1][-1:0]={{1,NULL},{3,4}}', 0, -1, 0, 0, NULL, 1, '{{1,NULL}}', 1, false);

-- name: selection_clamped_slice
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', -1, 0, -100, 100, NULL, NULL, '{10,NULL,30}', 1, false);

-- name: selection_empty_slice
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 9, 0, 9, 10, NULL, NULL, '{}', 1, false);

-- name: selection_reversed_slice
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 9, 0, 2, 0, NULL, NULL, '{}', 1, false);

-- name: selection_null_array_skips_division
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES (NULL, 1, 1, 0, 1, NULL, NULL, NULL, 0, false);

-- name: selection_null_slice_bound
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, NULL, 1, 10, NULL, NULL, 1, false);

-- name: selection_wrong_slot
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, 0, 1, 99, NULL, '{10,NULL}', 1, false);

-- name: selection_wrong_lane_slot
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:1][-1:0]={{1,NULL},{3,4}}', 0, -1, 0, 0, NULL, 99, '{{1,NULL}}', 1, false);

-- name: selection_wrong_slice_bounds
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, 0, 1, 10, NULL, '[0:1]={10,NULL}', 1, false);

-- name: selection_division_error
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, 0, 1, 10, NULL, '{10,NULL}', 0, false);

-- name: selection_guarded_division
INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, 0, 1, 10, NULL, '{10,NULL}', 0, true);

-- name: comparison_identical_null_cells
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, first_labels, second_labels, expected_label_order, minimum_amount, require_order, expected_member)
VALUES ('{1,NULL}', '{1,NULL}', true, 0, '{a}', '{z}', -1, '1', true, true);

-- name: comparison_first_difference
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, first_labels, second_labels, expected_label_order, minimum_amount, require_order, expected_member)
VALUES ('{1,2}', '{2,0}', false, -1, '{雪}', '{😊}', -1, '1.25', true, false);

-- name: comparison_null_cell_above_value
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{NULL}', '{9}', false, 1, '2', false, false);

-- name: comparison_shifted_bounds
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('[0:1]={1,NULL}', '{1,NULL}', false, -1, '1', true, false);

-- name: comparison_null_arrays
INSERT INTO lane_comparisons (minimum_amount, require_order) VALUES ('1', true);

-- name: comparison_empty_arrays
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{}', '{}', true, 0, '1', true, true);

-- name: comparison_prefix_cardinality
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{1}', '{1,NULL}', false, -1, '1', true, false);

-- name: comparison_wrong_equality
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{1}', '{2}', true, -1, '1', true, false);

-- name: comparison_wrong_order
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{1}', '{2}', false, 1, '1', true, false);

-- name: comparison_wrong_label_order
INSERT INTO lane_comparisons (first_labels, second_labels, expected_label_order, minimum_amount)
VALUES ('{a}', '{z}', 1, '1');

-- name: comparison_amount_below_minimum
INSERT INTO lane_comparisons (minimum_amount) VALUES ('0.50');

-- name: comparison_required_order_rejected
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{2}', '{1}', false, 1, '1', true, false);

-- name: comparison_wrong_membership
INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, minimum_amount, require_order, expected_member)
VALUES ('{1,NULL}', '{2}', false, -1, '1', true, false);

-- name: comparison_guarded_document_input
INSERT INTO lane_document_comparisons (first_payload, second_payload, bypass)
VALUES ('bad', 'bad', true);

-- name: comparison_document_shape_mismatch
INSERT INTO lane_document_comparisons (first_payload, second_payload, bypass)
VALUES ('{}', '{NULL}', false);

-- name: comparison_document_empty_missing_equality
INSERT INTO lane_document_comparisons (first_payload, second_payload, bypass)
VALUES ('{}', '{}', false);

-- name: comparison_document_null_cells_missing_equality
INSERT INTO lane_document_comparisons (first_payload, second_payload, bypass)
VALUES ('{NULL}', '{NULL}', false);

-- name: comparison_document_null_array
INSERT INTO lane_document_comparisons (first_payload, second_payload, bypass)
VALUES (NULL, '{}', false);

-- name: requirements_ignore_shape_and_duplicates
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('[0:1]={1,2}', '{{1,2,3}}', '{1,1}', '{4,NULL}', false);

-- name: requirements_empty_arrays
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{}', '{}', '{}', '{}', false);

-- name: requirements_null_arrays
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES (NULL, NULL, NULL, NULL, false);

-- name: requirements_unapproved_selection
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{1,2}', '{1}', '{1}', '{3}', false);

-- name: requirements_missing_required_slot
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{1}', '{1,2}', '{2}', '{3}', false);

-- name: requirements_forbidden_selection
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{1,2}', '{1,2}', '{1}', '{NULL,2,2}', false);

-- name: requirements_null_cell_is_not_a_member
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{1,NULL}', '{1,NULL}', '{1}', '{NULL}', false);

-- name: requirements_null_cell_cannot_be_required
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{1}', '{1}', '{NULL}', '{NULL}', false);

-- name: requirements_guarded_missing_slot
INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('{1}', '{1}', '{2}', '{NULL}', true);

-- name: requirements_guarded_document_input
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES ('bad', 'bad', true);

-- name: requirements_document_empty_missing_equality
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES ('{}', '{}', false);

-- name: requirements_document_null_cells_missing_equality
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES ('{NULL}', '{NULL}', false);

-- name: requirements_document_shape_missing_equality
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES ('{}', '{NULL}', false);

-- name: requirements_document_null_array
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES (NULL, '{}', false);

-- name: requirements_document_left_input_error
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES ('bad', '{}', false);

-- name: requirements_document_right_input_error
INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES (NULL, 'bad', false);

-- name: promotion_mixed_integer_arrays
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{1,2}', '{3,4}', '{1,2}', '{1,2}', '{3,4}', '{1,2}', '[1:2][1:2]', false, false);

-- name: promotion_shifted_bounds
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('[0:1]={1,NULL}', '[0:1]={3,4}', '[0:1]={1,NULL}', '[0:1]={1,NULL}', '[0:1]={1,NULL}', '[0:1]={1,NULL}', '[1:2][0:1]', true, false);

-- name: promotion_null_arrays
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);

-- name: promotion_empty_arrays
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{}', '{}', '{}', '{}', '{}', '{}', NULL, true, false);

-- name: promotion_bigint_fallback
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES (NULL, '{9223372036854775807}', NULL, '{9223372036854775807}', '{9223372036854775807}', NULL, NULL, false, false);

-- name: promotion_wrong_fallback
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{1,2}', '{3,4}', '{1,2}', '{3,4}', '{3,4}', '{1,2}', '[1:2][1:2]', false, false);

-- name: promotion_wrong_selected
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{1,2}', '{3,4}', '{1,2}', '{1,2}', '{1,2}', '{1,2}', '[1:2][1:2]', false, false);

-- name: promotion_wrong_narrowed
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{1,2}', '{3,4}', '{1,2}', '{1,2}', '{3,4}', '{2,1}', '[1:2][1:2]', false, false);

-- name: promotion_narrowing_overflow
INSERT INTO lane_promotions (narrow_slots, expected_narrow, bypass)
VALUES ('{32768}', '{32768}', false);

-- name: promotion_guarded_narrowing
INSERT INTO lane_promotions (narrow_slots, expected_narrow, bypass)
VALUES ('{32768}', '{32768}', true);

-- name: promotion_nonrectangular_batch
INSERT INTO lane_promotions (small_slots, big_slots, expected_fallback, expected_selected, expected_layout, use_small)
VALUES ('{1}', '{2,3}', '{1}', '{2,3}', '[1:2][1:2]', false);

-- name: promotion_wrong_batch_layout
INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{1,2}', '{3,4}', '{1,2}', '{1,2}', '{3,4}', '{1,2}', '[0:1][1:2]', false, false);

-- name: stage_arrays_schema_order
INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES ('{new}', '{new,done}', '{new}', true);

-- name: stage_arrays_fallback
INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES (NULL, '{done,new}', '{done,new}', true);

-- name: stage_arrays_empty
INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES ('{}', '{}', '{}', true);

-- name: stage_arrays_wrong_rendered_label
INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES ('{new}', '{new,done}', '{done}', true);

-- name: stage_arrays_wrong_order
INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES ('{done}', '{new,done}', '{done}', true);

-- name: stage_arrays_unapproved_label
INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES ('{done}', '{new}', '{done}', false);

-- name: search_shifted_duplicate_matches
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('[0:3]={1,NULL,1,2}', 1, 1, 0, 2, '{0,2}', true);

-- name: search_null_cells
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('[-2:1]={NULL,1,NULL,2}', NULL, -1, -2, 0, '{-2,0}', true);

-- name: search_absent_value
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,2}', 9, 1, NULL, NULL, '{}', false);

-- name: search_empty_array_ignores_null_start
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{}', 1, NULL, NULL, NULL, '{}', false);

-- name: search_null_array_ignores_null_start
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES (NULL, 1, NULL, NULL, NULL, NULL, false);

-- name: search_null_needle_without_nulls_ignores_null_start
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,2}', NULL, NULL, NULL, NULL, '{}', false);

-- name: search_start_after_array
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,1}', 1, 3, 1, NULL, '{1,2}', true);

-- name: search_wrong_first
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,1}', 1, 1, 2, 1, '{1,2}', true);

-- name: search_wrong_start
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,1}', 1, 2, 1, 1, '{1,2}', true);

-- name: search_wrong_positions
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,1}', 1, 1, 1, 1, '{1}', true);

-- name: search_required_absent_value
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{1,2}', 9, 1, NULL, NULL, '{}', true);

-- name: search_null_start_rejected
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{NULL,1}', NULL, NULL, 1, NULL, '{1}', true);

-- name: search_multidimensional_rejected
INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('{{1,2}}', 1, 1, NULL, NULL, NULL, false);

-- name: search_stages_schema_labels
INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES ('[0:2]={new,done,new}', 'new', 0, '{0,2}');

-- name: search_stages_null_label
INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES ('{new,NULL,done,NULL}', NULL, 2, '{2,4}');

-- name: search_stages_absent_label
INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES ('{new}', 'done', NULL, '{}');

-- name: search_stages_null_array
INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES (NULL, 'done', NULL, NULL);

-- name: search_stages_wrong_first
INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES ('{new,done,new}', 'new', 2, '{1,3}');

-- name: search_stages_wrong_positions
INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES ('{new,done,new}', 'new', 1, '{1}');

-- name: search_documents_empty_fast_path
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{}', '{NULL}', NULL, false);

-- name: search_documents_null_needle_without_nulls
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{null}', '{NULL}', NULL, false);

-- name: search_documents_missing_equality
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{NULL}', '{NULL}', 1, false);

-- name: search_documents_null_start_before_equality
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{NULL}', '{NULL}', NULL, false);

-- name: search_documents_missing_equality_after_end
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{null}', '{null}', 999, false);

-- name: search_documents_multidimensional_before_equality
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{{NULL}}', '{NULL}', NULL, false);

-- name: search_documents_needle_error_before_null_source
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES (NULL, '{bad}', NULL, false);

-- name: search_documents_guarded_input
INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{bad}', '{bad}', NULL, true);

-- name: extension_preserves_lower_bound
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('[0:1]={1,NULL}', 2, '[0:2]={1,NULL,2}', '[0:2]={2,1,NULL}', false);

-- name: extension_null_array
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES (NULL, NULL, '{NULL}', '{NULL}', false);

-- name: extension_empty_array
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('{}', 3, '{3}', '{3}', false);

-- name: extension_null_cell
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('{1,2}', NULL, '{1,2,NULL}', '{NULL,1,2}', false);

-- name: extension_wrong_append
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('{1}', 2, '{2,1}', '{2,1}', false);

-- name: extension_wrong_prepend
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('{1}', 2, '{1,2}', '{1,2}', false);

-- name: extension_rank_error
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('{{1,2}}', 3, NULL, NULL, false);

-- name: extension_append_bound_error
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('[2147483646:2147483646]={1}', 2, NULL, NULL, false);

-- name: extension_prepend_index_error
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('[-2147483648:-2147483648]={1}', 2, '[-2147483648:-2147483647]={1,2}', NULL, false);

-- name: extension_guarded_rank
INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('{{1,2}}', 3, NULL, NULL, true);

-- name: joined_batches_promoted_rows
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('[0:1]={1,2}', '[5:6][0:1]={{3,4},{5,6}}', '[5:7][0:1]={{1,2},{3,4},{5,6}}', '[5:7][0:1]');

-- name: joined_batches_reverse_ranks
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('[5:6][0:1]={{1,2},{3,4}}', '[0:1]={5,6}', '[5:7][0:1]={{1,2},{3,4},{5,6}}', '[5:7][0:1]');

-- name: joined_batches_equal_ranks
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('[0:1]={1,NULL}', '[5:6]={3,4}', '[0:3]={1,NULL,3,4}', '[0:3]');

-- name: joined_batches_empty_identity
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('{}', '[5:6][0:1]={{1,2},{3,4}}', '[5:6][0:1]={{1,2},{3,4}}', '[5:6][0:1]');

-- name: joined_batches_null_identity
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES (NULL, '{9007199254740993}', '{9007199254740993}', '[1:1]');

-- name: joined_batches_both_null
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES (NULL, NULL, NULL, NULL);

-- name: joined_batches_both_empty
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('{}', '{}', '{}', NULL);

-- name: joined_batches_wrong_contents
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('{1}', '{2}', '{2,1}', '[1:2]');

-- name: joined_batches_wrong_layout
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('{1}', '{2}', '{1,2}', '[0:1]');

-- name: joined_batches_rank_error
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('{1}', '{{{2}}}', NULL, NULL);

-- name: joined_batches_length_error
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('{1}', '{{2,3}}', NULL, NULL);

-- name: joined_batches_inner_lower_error
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('[0:1]={1,2}', '{{3,4}}', NULL, NULL);

-- name: joined_batches_bound_error
INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('[2147483646:2147483646]={1}', '{2}', NULL, NULL);

-- name: stage_extensions_labels
INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES ('{new}', 'done', '{done}', '{new,done}', '{done,new}', '{new,done}');

-- name: stage_extensions_null_array
INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES (NULL, NULL, NULL, '{NULL}', '{NULL}', NULL);

-- name: stage_extensions_null_label
INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES ('{new}', NULL, '{done}', '{new,NULL}', '{NULL,new}', '{new,done}');

-- name: stage_extensions_wrong_append
INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES ('{new}', 'done', '{done}', '{done,new}', '{done,new}', '{new,done}');

-- name: stage_extensions_wrong_prepend
INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES ('{new}', 'done', '{done}', '{new,done}', '{new,done}', '{new,done}');

-- name: stage_extensions_wrong_join
INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES ('{new}', 'done', '{done}', '{new,done}', '{done,new}', '{done,new}');

-- name: document_extensions_no_equality_required
INSERT INTO lane_document_extensions (payload, extra_payload, expected_payload, bypass)
VALUES ('{1}', '{"null",NULL}', '{1,"null",NULL}', false);

-- name: document_extensions_null_identity
INSERT INTO lane_document_extensions (payload, extra_payload, expected_payload, bypass)
VALUES (NULL, '{"null"}', '{"null"}', false);

-- name: document_extensions_wrong_contents
INSERT INTO lane_document_extensions (payload, extra_payload, expected_payload, bypass)
VALUES ('{1}', '{2}', '{2,1}', false);

-- name: document_extensions_eager_second_input
INSERT INTO lane_document_extensions (payload, extra_payload, expected_payload, bypass)
VALUES (NULL, '{bad}', NULL, false);

-- name: document_extensions_guarded_inputs
INSERT INTO lane_document_extensions (payload, extra_payload, expected_payload, bypass)
VALUES ('{bad}', '{bad}', NULL, true);

-- name: revisions_preserve_lower_bound_and_promote
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('[0:3]={1,NULL,1,2}', 1, 9007199254740993, '[0:1]={NULL,2}', '[0:3]={9007199254740993,NULL,9007199254740993,2}', false);

-- name: revisions_remove_null_cells
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{NULL,1,NULL}', NULL, 2, '{1}', '{2,1,2}', false);

-- name: revisions_replace_with_null
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1,2,1}', 1, NULL, '{2}', '{NULL,2,NULL}', false);

-- name: revisions_all_removed
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('[-3:-2]={1,1}', 1, 2, '{}', '[-3:-2]={2,2}', false);

-- name: revisions_absent_needle
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('[0:1]={1,NULL}', 9, 2, '[0:1]={1,NULL}', '[0:1]={1,NULL}', false);

-- name: revisions_empty
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{}', NULL, NULL, '{}', '{}', false);

-- name: revisions_null_source
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, false);

-- name: revisions_wrong_removal
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1,2}', 1, 3, '{1}', '{3,2}', false);

-- name: revisions_wrong_replacement
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1,2}', 1, 3, '{2}', '{1,3}', false);

-- name: revisions_multidimensional_removal_error
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{{1,NULL},{2,1}}', 1, 3, NULL, '{{3,NULL},{2,3}}', false);

-- name: revisions_multidimensional_replacement
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('[0:1][2:3]={{1,NULL},{2,1}}', 1, 3, NULL, '[0:1][2:3]={{3,NULL},{2,3}}', true);

-- name: revisions_minimum_lower_bound
INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('[-2147483648:-2147483647]={1,2}', 1, 3, '[-2147483648:-2147483648]={2}', '[-2147483648:-2147483647]={3,2}', false);

-- name: stage_revisions_labels
INSERT INTO lane_stage_revisions (stages, needle, replacement, expected_remove, expected_replace)
VALUES ('{new,NULL,new,done}', 'new', 'done', '{NULL,done}', '{done,NULL,done,done}');

-- name: stage_revisions_null_label
INSERT INTO lane_stage_revisions (stages, needle, replacement, expected_remove, expected_replace)
VALUES ('[0:2]={new,NULL,done}', NULL, 'new', '[0:1]={new,done}', '[0:2]={new,new,done}');

-- name: stage_revisions_null_source
INSERT INTO lane_stage_revisions (stages, needle, replacement, expected_remove, expected_replace)
VALUES (NULL, 'new', 'done', NULL, NULL);

-- name: stage_revisions_wrong_removal
INSERT INTO lane_stage_revisions (stages, needle, replacement, expected_remove, expected_replace)
VALUES ('{new,done}', 'new', 'done', '{new}', '{done,done}');

-- name: stage_revisions_wrong_replacement
INSERT INTO lane_stage_revisions (stages, needle, replacement, expected_remove, expected_replace)
VALUES ('{new,done}', 'new', 'done', '{done}', '{new,done}');

-- name: document_revisions_empty_without_equality
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{}', '{1}', '{2}', '{}', '{}', false);

-- name: document_revisions_null_source
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES (NULL, '{1}', '{2}', NULL, NULL, false);

-- name: document_revisions_null_only_requires_equality
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{NULL}', NULL, NULL, NULL, NULL, false);

-- name: document_revisions_nonnull_requires_equality
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1}', NULL, NULL, NULL, NULL, false);

-- name: document_revisions_rank_before_equality
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{{NULL}}', NULL, NULL, NULL, NULL, false);

-- name: document_revisions_replacement_error_before_null_source
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES (NULL, '{1}', '{bad}', NULL, NULL, false);

-- name: document_revisions_guarded_inputs
INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{bad}', '{bad}', '{bad}', NULL, NULL, true);

-- name: jsonb_revisions_numeric_equality
INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1.0,1,2}', '{1}', '{0}', '{2}', '{0,0,2}', false);

-- name: jsonb_revisions_json_null
INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{"null",NULL,1}', '{"null"}', '{2}', '{NULL,1}', '{2,NULL,1}', false);

-- name: jsonb_revisions_sql_null
INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{NULL,1}', NULL, '{"null"}', '{1}', '{"null",1}', false);

-- name: jsonb_revisions_wrong_removal
INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1,2}', '{1}', '{3}', '{1}', '{3,2}', false);

-- name: jsonb_revisions_wrong_replacement
INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1,2}', '{1}', '{3}', '{2}', '{1,3}', false);

-- name: jsonb_revisions_multidimensional_replacement
INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{{1,NULL},{2,1}}', '{1}', '{3}', NULL, '{{3,NULL},{2,3}}', true);

-- name: templates_bounded_dimensions
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2,2}', '{0,-2}', '{{7,7},{7,7}}', '[0:1][-2:-1]={{7,7},{7,7}}', false);

-- name: templates_null_seed
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (NULL, '{2}', '{0}', '{NULL,NULL}', '[0:1]={NULL,NULL}', false);

-- name: templates_empty_dimensions
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{}', '{}', '{}', '{}', false);

-- name: templates_zero_dimension
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2,0}', '{0,2147483647}', '{}', '{}', false);

-- name: templates_wrong_default
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2}', '{0}', '{7}', '[0:1]={7,7}', false);

-- name: templates_wrong_bounded
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2}', '{0}', '{7,7}', '{7,7}', false);

-- name: templates_null_dimensions
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, NULL, '{1}', NULL, NULL, false);

-- name: templates_null_lower_bounds
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{}', NULL, '{}', NULL, false);

-- name: templates_null_dimension_cell
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{NULL}', '{1}', NULL, NULL, false);

-- name: templates_negative_after_zero
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{0,-1}', '{1,1}', NULL, NULL, false);

-- name: templates_dimension_vector_rank
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{{2}}', '{1}', NULL, NULL, false);

-- name: templates_lower_vector_rank
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2}', '{{1}}', '{7,7}', NULL, false);

-- name: templates_mismatched_vectors
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2}', '{}', '{7,7}', NULL, false);

-- name: templates_dimension_limit
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{1,1,1,1,1,1,1}', '{1,1,1,1,1,1,1}', NULL, NULL, false);

-- name: templates_portable_count_overflow
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (NULL, '{268435456}', '{1}', NULL, NULL, false);

-- name: templates_guarded_dimensions
INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{NULL}', NULL, NULL, NULL, true);

-- name: truncations_multidimensional
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('[0:1][2:3]={{1,2},{3,4}}', 1, '{{1,2}}');

-- name: truncations_zero_resets_bounds
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('[0:1]={1,NULL}', 0, '{1,NULL}');

-- name: truncations_all_elements
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('[0:1]={1,NULL}', 2, '{}');

-- name: truncations_null_source
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES (NULL, -1, NULL);

-- name: truncations_null_count
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('{1,2}', NULL, NULL);

-- name: truncations_negative_count
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('{1,2}', -1, NULL);

-- name: truncations_excess_count
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('{1,2}', 3, NULL);

-- name: truncations_wrong_contents
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('{1,2}', 1, '{2}');

-- name: truncations_minimum_lower_overflow
INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('[-2147483648:-2147483647]={1,2}', 2, '{1,2}');

-- name: stage_templates_schema_identity
INSERT INTO lane_stage_templates (seed, dimensions, lower_bounds, expected_fill, stages, trim_count, expected_trim)
VALUES ('done', '{2}', '{0}', '[0:1]={done,done}', '[3:4]={new,done}', 1, '{new}');

-- name: stage_templates_null_cells
INSERT INTO lane_stage_templates (seed, dimensions, lower_bounds, expected_fill, stages, trim_count, expected_trim)
VALUES (NULL, '{2}', '{0}', '[0:1]={NULL,NULL}', NULL, NULL, NULL);

-- name: stage_templates_wrong_fill
INSERT INTO lane_stage_templates (seed, dimensions, lower_bounds, expected_fill, stages, trim_count, expected_trim)
VALUES ('done', '{2}', '{0}', '[0:1]={new,new}', '{new,done}', 1, '{new}');

-- name: stage_templates_wrong_trim
INSERT INTO lane_stage_templates (seed, dimensions, lower_bounds, expected_fill, stages, trim_count, expected_trim)
VALUES ('done', '{2}', '{0}', '[0:1]={done,done}', '{new,done}', 1, '{done}');

-- name: document_templates_owned_cells
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('{"a":[1]}'::jsonb, '{2,2}', 4, '[1:2][1:2]', '{"a":[1]}'::jsonb);

-- name: document_templates_sql_null
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES (NULL, '{1,1}', 1, '[1:1][1:1]', NULL);

-- name: document_templates_json_null
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('null'::jsonb, '{1,1}', 1, '[1:1][1:1]', 'null'::jsonb);

-- name: document_templates_empty
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('{"a":[1]}'::jsonb, '{}', 0, NULL, NULL);

-- name: document_templates_wrong_count
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('{"a":[1]}'::jsonb, '{2,2}', 3, '[1:2][1:2]', '{"a":[1]}'::jsonb);

-- name: document_templates_wrong_layout
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('{"a":[1]}'::jsonb, '{2,2}', 4, '[0:1][0:1]', '{"a":[1]}'::jsonb);

-- name: document_templates_wrong_cell
INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('{"a":[1]}'::jsonb, '{2,2}', 4, '[1:2][1:2]', '{"a":[2]}'::jsonb);

-- name: text_imports_empty_fields
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('a,,NULL,', ',', 'NULL', '{a,"",NULL,""}', 'a,,NULL,', 4);

-- name: text_imports_empty_input
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('', ',', '', '{}', '', 0);

-- name: text_imports_null_input
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES (NULL, ',', 'NULL', NULL, NULL, NULL);

-- name: text_imports_character_delimiter
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('雪😊a', NULL, NULL, '{雪,😊,a}', NULL, 3);

-- name: text_imports_whole_input
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('abc', '', NULL, '{abc}', 'abc', 1);

-- name: text_imports_whole_null_marker
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('abc', '', 'abc', '{NULL}', 'abc', 1);

-- name: text_imports_overlapping_delimiter
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('aaa', 'aa', NULL, '{"",a}', 'aaa', 2);

-- name: text_imports_trailing_delimiter
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('x雪雪', '雪', NULL, '{x,"",""}', 'x雪雪', 3);

-- name: text_imports_empty_marker
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('a,,b', ',', '', '{a,NULL,b}', 'a,,b', 3);

-- name: text_imports_wrong_array
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('a,b', ',', NULL, '{b,a}', 'a,b', 2);

-- name: text_imports_wrong_join
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('a,b', ',', NULL, '{a,b}', 'b,a', 2);

-- name: text_imports_wrong_count
INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('a,b', ',', NULL, '{a,b}', 'a,b', 1);

-- name: string_exports_flattened_bounds
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('[0:1][2:3]={{1,NULL},{2,3}}', '|', 'missing', '1|2|3', '1|missing|2|3');

-- name: string_exports_empty_markers
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{NULL,NULL}', ',', '', '', ',');

-- name: string_exports_skipped_nulls
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{1,NULL,2}', ',', NULL, '1,2', '1,2');

-- name: string_exports_empty_array
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{}', ',', 'NULL', '', '');

-- name: string_exports_null_array
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES (NULL, ',', 'NULL', NULL, NULL);

-- name: string_exports_null_separator
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{1,NULL}', NULL, 'NULL', NULL, NULL);

-- name: string_exports_empty_separator
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{1,NULL,2}', '', 'x', '12', '1x2');

-- name: string_exports_wrong_skip
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{1,NULL,2}', ',', 'NULL', '1,NULL,2', '1,NULL,2');

-- name: string_exports_wrong_marked
INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('{1,NULL,2}', ',', 'NULL', '1,2', '1,2');

-- name: stage_exports_nominal_labels
INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES ('[0:2]={new,NULL,done}', '|', 'missing', 'new|missing|done');

-- name: stage_exports_skip_null
INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES ('{new,NULL,done}', ',', NULL, 'new,done');

-- name: stage_exports_all_null
INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES ('{NULL,NULL}', ',', '', ',');

-- name: stage_exports_empty
INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES ('{}', '|', 'NULL', '');

-- name: stage_exports_null
INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES (NULL, '|', 'NULL', NULL);

-- name: stage_exports_wrong_labels
INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES ('{new,done}', '|', NULL, 'done|new');

-- name: document_exports_logical_rendering
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('{1.0,"null",NULL}', '|', 'missing', '1.0|null|missing', false);

-- name: document_exports_skip_sql_null
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('{1.0,"null",NULL}', '|', NULL, '1.0|null', false);

-- name: document_exports_empty
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('{}', '|', 'missing', '', false);

-- name: document_exports_null
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES (NULL, '|', 'missing', NULL, false);

-- name: document_exports_wrong_json_null
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('{"null",NULL}', '|', 'missing', 'missing|null', false);

-- name: document_exports_reached_error
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('bad', '|', NULL, NULL, false);

-- name: document_exports_skipped_error
INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('bad', '|', NULL, NULL, true);
