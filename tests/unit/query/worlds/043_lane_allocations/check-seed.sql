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

-- name: reversals_matrix
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('[0:1][2:3]={{1,NULL},{2,3}}', '[0:1][2:3]={{2,3},{1,NULL}}', false);

-- name: reversals_vector
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('[0:2]={1,NULL,2}', '[0:2]={2,NULL,1}', false);

-- name: reversals_empty
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('{}', '{}', false);

-- name: reversals_null
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES (NULL, NULL, false);

-- name: reversals_single_row
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('[0:0][2:3]={{1,2}}', '[0:0][2:3]={{1,2}}', false);

-- name: reversals_signed_minimum
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('[-2147483648:-2147483647]={1,2}', '[-2147483648:-2147483647]={2,1}', false);

-- name: reversals_wrong_order
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('{1,2}', '{1,2}', false);

-- name: reversals_wrong_bounds
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('[0:1]={1,2}', '{2,1}', false);

-- name: reversals_skipped
INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('{1,2}', '{wrong}', true);

-- name: stage_reversals_labels
INSERT INTO lane_stage_reversals (stages, expected_stages)
VALUES ('[0:2]={new,NULL,done}', '[0:2]={done,NULL,new}');

-- name: stage_reversals_empty
INSERT INTO lane_stage_reversals (stages, expected_stages)
VALUES ('{}', '{}');

-- name: stage_reversals_null
INSERT INTO lane_stage_reversals (stages, expected_stages)
VALUES (NULL, NULL);

-- name: stage_reversals_wrong_labels
INSERT INTO lane_stage_reversals (stages, expected_stages)
VALUES ('{new,done}', '{new,done}');

-- name: document_reversals_owned
INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES ('{1,"null",NULL}', '{NULL,"null",1}', false);

-- name: document_reversals_empty
INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES ('{}', '{}', false);

-- name: document_reversals_null
INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES (NULL, NULL, false);

-- name: document_reversals_wrong_order
INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES ('{1,2}', '{1,2}', false);

-- name: document_reversals_reached_error
INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES ('bad', NULL, false);

-- name: document_reversals_skipped_error
INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES ('bad', NULL, true);

-- name: binary_exports_empty
INSERT INTO lane_binary_exports (stages, bypass)
VALUES ('{}', false);

-- name: binary_exports_null_cells
INSERT INTO lane_binary_exports (stages, bypass)
VALUES ('{NULL}', false);

-- name: binary_exports_values
INSERT INTO lane_binary_exports (stages, bypass)
VALUES ('{new,done}', false);

-- name: binary_exports_skipped
INSERT INTO lane_binary_exports (stages, bypass)
VALUES ('{new}', true);

-- name: binary_exports_null
INSERT INTO lane_binary_exports (stages, bypass)
VALUES (NULL, false);

-- name: binary_exports_null_skipped
INSERT INTO lane_binary_exports (stages, bypass)
VALUES (NULL, true);

-- name: sorted_slots_orders
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('[0:3]={2,NULL,0,1}', true, false, '[0:3]={0,1,2,NULL}', '[0:3]={NULL,2,1,0}', '[0:3]={2,1,0,NULL}');

-- name: sorted_slots_nulls_first
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{2,NULL,1}', false, true, '{1,2,NULL}', '{1,2,NULL}', '{NULL,1,2}');

-- name: sorted_slots_matrix
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('[0:1][2:3]={{NULL,1},{2,NULL}}', true, true, '[0:1][2:3]={{2,NULL},{NULL,1}}', '[0:1][2:3]={{NULL,1},{2,NULL}}', '[0:1][2:3]={{NULL,1},{2,NULL}}');

-- name: sorted_slots_empty
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{}', false, false, '{}', '{}', '{}');

-- name: sorted_slots_null
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES (NULL, true, false, NULL, NULL, NULL);

-- name: sorted_slots_null_direction
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{2,1}', NULL, false, '{1,2}', NULL, NULL);

-- name: sorted_slots_null_null_order
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{2,1}', false, NULL, '{1,2}', '{1,2}', NULL);

-- name: sorted_slots_wrong_default
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{2,1}', false, false, '{2,1}', '{1,2}', '{1,2}');

-- name: sorted_slots_wrong_order
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{2,1}', true, false, '{1,2}', '{1,2}', '{2,1}');

-- name: sorted_slots_wrong_null_placement
INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('{2,NULL,1}', false, true, '{1,2,NULL}', '{1,2,NULL}', '{1,2,NULL}');

-- name: sorted_stages_labels
INSERT INTO lane_sorted_stages (stages, expected_stages)
VALUES ('{done,NULL,new}', '{new,done,NULL}');

-- name: sorted_stages_empty
INSERT INTO lane_sorted_stages (stages, expected_stages)
VALUES ('{}', '{}');

-- name: sorted_stages_null
INSERT INTO lane_sorted_stages (stages, expected_stages)
VALUES (NULL, NULL);

-- name: sorted_stages_wrong_labels
INSERT INTO lane_sorted_stages (stages, expected_stages)
VALUES ('{done,new}', '{done,new}');

-- name: sorted_documents_numbers
INSERT INTO lane_sorted_documents (payload, expected_payload)
VALUES ('{2,1,NULL}', '{1,2,NULL}');

-- name: sorted_documents_json_null
INSERT INTO lane_sorted_documents (payload, expected_payload)
VALUES ('{1,"null",NULL}', '{"null",1,NULL}');

-- name: sorted_documents_empty
INSERT INTO lane_sorted_documents (payload, expected_payload)
VALUES ('{}', '{}');

-- name: sorted_documents_null
INSERT INTO lane_sorted_documents (payload, expected_payload)
VALUES (NULL, NULL);

-- name: sorted_documents_wrong_order
INSERT INTO lane_sorted_documents (payload, expected_payload)
VALUES ('{2,1}', '{2,1}');

-- name: unsortable_documents_empty
INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES ('{}', false);

-- name: unsortable_documents_singleton
INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES ('{1}', false);

-- name: unsortable_documents_null
INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES (NULL, false);

-- name: unsortable_documents_no_comparator
INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES ('{NULL,NULL}', false);

-- name: unsortable_documents_matrix_no_comparator
INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES ('{{NULL},{NULL}}', false);

-- name: unsortable_documents_skipped
INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES ('{1,2}', true);

-- name: sorted_precision_exact_duplicates
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{1.00,0,1.00}', '{0,1.00,1.00}', 3, '0', false);

-- name: sorted_precision_ambiguous_ties
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{0,1.0,1.00,2}', '{0,1.0,1.00,2}', 4, '0', false);

-- name: sorted_precision_distinct
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{2,0,1}', '{0,1,2}', 3, '0', false);

-- name: sorted_precision_empty
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{}', '{}', 0, NULL, false);

-- name: sorted_precision_null
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES (NULL, NULL, NULL, NULL, false);

-- name: sorted_precision_wrong_count
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{2,0,1}', '{0,1,2}', 2, '0', false);

-- name: sorted_precision_wrong_first
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{2,0,1}', '{0,1,2}', 3, '1', false);

-- name: sorted_precision_wrong_text
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{2,0,1}', '{2,0,1}', 3, '0', false);

-- name: sorted_precision_reached_error
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('bad', NULL, NULL, NULL, false);

-- name: sorted_precision_skipped_error
INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('bad', NULL, NULL, NULL, true);

-- name: document_paths_nested
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":[{"id":7},{"id":8}]}', '{"a":[{"id":7},{"id":8}]}', '{a,-1,id}', '8', '8', '8', '8');

-- name: document_paths_bounds
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', '[0:1]={a,x}', '1', '1', '1', '1');

-- name: document_paths_matrix
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', '{{a},{x}}', '1', '1', '1', '1');

-- name: document_paths_duplicate_prefix
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":{"x":1},"a":{}}', '{"a":{"x":1},"a":{}}', '{a,x}', '1', '1', NULL, NULL);

-- name: document_paths_duplicate_leaf
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":{"x":1,"x":2}}', '{"a":{"x":1,"x":2}}', '{a,x}', '2', '2', '2', '2');

-- name: document_paths_empty_number
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('  1.00e+2  ', '  1.00e+2  ', '{}', '  1.00e+2', '  1.00e+2', '100', '100');

-- name: document_paths_empty_string
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('  "x"  ', '  "x"  ', '{}', '  "x"', 'x', '"x"', 'x');

-- name: document_paths_json_null
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('null', 'null', '{}', 'null', NULL, 'null', NULL);

-- name: document_paths_empty_object
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES (' {} ', ' {} ', '{}', '{}', '{}', '{}', '{}');

-- name: document_paths_missing
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', '{missing}', NULL, NULL, NULL, NULL);

-- name: document_paths_null_cell
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', '{a,NULL}', NULL, NULL, NULL, NULL);

-- name: document_paths_null_array
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', NULL, NULL, NULL, NULL, NULL);

-- name: document_paths_sql_null
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES (NULL, NULL, '{}', NULL, NULL, NULL, NULL);

-- name: document_paths_unicode
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"雪":"😊"}', '{"雪":"😊"}', '{雪}', '"😊"', '😊', '"😊"', '😊');

-- name: document_paths_decode
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":"\u00e9"}', '{"a":"\u00e9"}', '{a}', '"\u00e9"', 'é', '"é"', 'é');

-- name: document_paths_bad_index
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('[1,2]', '[1,2]', '{"1 "}', NULL, NULL, NULL, NULL);

-- name: document_paths_signed_index
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('[1,2]', '[1,2]', '{+1}', '2', '2', '2', '2');

-- name: document_paths_wrong_raw
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', '{a}', '2', '1', '1', '1');

-- name: document_paths_wrong_text
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', '{a}', '1', 'wrong', '1', '1');

-- name: document_paths_wrong_binary
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', '{a}', '1', '1', '2', '1');

-- name: document_paths_wrong_binary_text
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1}', '{"a":1}', '{a}', '1', '1', '1', 'wrong');

-- name: expanded_paths_nested
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', 'a', 'x', '1', '1');

-- name: expanded_paths_duplicate
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1},"a":null}', '{"a":{"x":1},"a":null}', 'a', 'x', '1', NULL);

-- name: expanded_paths_null_key
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', NULL, 'x', NULL, NULL);

-- name: expanded_paths_sql_null
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES (NULL, NULL, 'a', 'x', NULL, NULL);

-- name: expanded_paths_unmatched_error
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1},"bad":"\u0000"}', '{"a":{"x":1}}', 'a', 'x', '1', '1');

-- name: expanded_paths_wrong_raw
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', 'a', 'x', '2', '1');

-- name: expanded_paths_wrong_binary
INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', 'a', 'x', '1', '2');

-- name: document_keys_match
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1,"b":null}', '{a,b}', true, true, false);

-- name: document_keys_partial
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1}', '{a,missing}', true, false, false);

-- name: document_keys_skipped_missing
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1}', '{missing}', false, false, true);

-- name: document_keys_null_cells
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1}', '{NULL,a}', true, true, false);

-- name: document_keys_empty
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{}', '{}', false, true, true);

-- name: document_keys_bounds
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1,"b":2}', '[0:1]={a,b}', true, true, false);

-- name: document_keys_matrix
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('["a","b"]', '{{a},{b}}', true, true, false);

-- name: document_keys_scalar
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('"a"', '{a}', true, true, false);

-- name: document_keys_unicode
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"雪":1}', '{雪}', true, true, false);

-- name: document_keys_null_array
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{}', NULL, NULL, NULL, false);

-- name: document_keys_sql_null
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES (NULL, '{a}', NULL, NULL, false);

-- name: document_keys_wrong_any
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1}', '{a}', false, true, false);

-- name: document_keys_wrong_all
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1}', '{a}', true, false, false);

-- name: document_keys_required_missing
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{}', '{missing}', false, false, false);

-- name: document_paths_unmatched_decode_error
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1,"bad":"\u0000"}', '{"a":1}', '{a}', '1', '1', '1', '1');

-- name: document_paths_null_cell_skips_decode
INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":1,"bad":"\u0000"}', '{"a":1}', '{NULL}', NULL, NULL, NULL, NULL);

-- name: document_keys_only_null_cells
INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{}', '{NULL,NULL}', false, true, true);

-- name: jsonb_arrays_values
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_matrix
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('[0:1][3:4]={{1,NULL},{2,3}}', '{{a,1},{b,2}}', '{{1,"null"},{2,3}}', '{{1.00,2.5},{3,4}}', '[[1,null],[2,3]]', '[["a","1"],["b","2"]]', '[[1,null],[2,3]]', '[[1.00,2.5],[3,4]]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[[1,null],[2,3]],null]', '{"slots":[[1,null],[2,3]]}', false);

-- name: jsonb_arrays_empty
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{}', '{}', '{}', '{}', '[]', '[]', '[]', '[]', '[]', '{}', '[[],null]', '{"slots":[]}', false);

-- name: jsonb_arrays_null
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[null,null]', '{"slots":null}', true);

-- name: jsonb_arrays_duplicate_keys
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,2}', '{a,1,a,2}', '{}', '{}', '[1,2]', '["a","1","a","2"]', '[]', '[]', '[1,2]', '{"a":"2"}', '[[1,2],null]', '{"slots":[1,2]}', false);

-- name: jsonb_arrays_unicode
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{}', '{雪,😊}', '{}', '{}', '[]', '["雪","😊"]', '[]', '[]', '[]', '{"雪":"😊"}', '[[],null]', '{"slots":[]}', false);

-- name: jsonb_arrays_wrong_slots
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '["wrong"]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_labels
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["wrong"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_documents
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '["wrong"]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_amounts
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '["wrong"]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_flattened
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '["wrong"]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_object
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '["wrong"]', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_nested
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '["wrong"]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_wrong_named
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '["wrong"]', false);

-- name: jsonb_arrays_odd_object
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_null_key
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{NULL,1}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

-- name: jsonb_arrays_null_variadic_required
INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[null,null]', '{"slots":null}', false);

-- name: jsonb_import_values
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{1,"null",2}', '[1,null,2]', '[1,null,2]', 1, false);

-- name: jsonb_import_matrix
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{{1,"null"},{2,3}}', '[[1,null],[2,3]]', '[1,null,2,3]', 1, false);

-- name: jsonb_import_empty
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{}', '[]', '[]', 1, false);

-- name: jsonb_import_null
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES (NULL, NULL, NULL, 1, false);

-- name: jsonb_import_decode_error
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{"\"\\u0000\"",1}', NULL, NULL, 1, false);

-- name: jsonb_import_eager_division
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{"\"\\u0000\"",1}', NULL, NULL, 0, false);

-- name: jsonb_import_bad_array
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('bad', NULL, NULL, 1, false);

-- name: jsonb_import_skipped
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('bad', NULL, NULL, 0, true);

-- name: jsonb_import_wrong_nested
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{1}', '[2]', '[1]', 1, false);

-- name: jsonb_import_wrong_flattened
INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{1}', '[1]', '[2]', 1, false);

-- name: jsonb_enum_empty
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{}', '[]', false);

-- name: jsonb_enum_null
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES (NULL, NULL, false);

-- name: jsonb_enum_null_cells
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{NULL,NULL}', '[null,null]', false);

-- name: jsonb_enum_captured_labels
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{new,done}', '["new","done"]', false);

-- name: jsonb_enum_skipped
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{new,done}', NULL, true);

-- name: jsonb_enum_wrong_empty
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{}', '[1]', false);

-- name: mutated_array_before
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{1}', '9', false, false, true, '[1,3]', '[1,9,3]', '[1,9,2,3]', false);

-- name: mutated_array_after
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{1}', '9', true, true, true, '[1,3]', '[1,9,3]', '[1,2,9,3]', false);

-- name: mutated_array_negative
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{-1}', '9', true, false, true, '[1,2]', '[1,2,9]', '[1,2,9,3]', false);

-- name: mutated_array_prepend
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{-99}', '9', true, true, true, '[1,2,3]', '[9,1,2,3]', '[9,1,2,3]', false);

-- name: mutated_array_append
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{99}', '9', true, false, true, '[1,2,3]', '[1,2,3,9]', '[1,2,3,9]', false);

-- name: mutated_array_no_create
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{99}', '9', false, false, true, '[1,2,3]', '[1,2,3]', '[1,2,3,9]', false);

-- name: mutated_array_nested
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":[1,2],"keep":true}', '{a,0}', '{"x":[4]}', true, false, true, '{"a":[2],"keep":true}', '{"a":[{"x":[4]},2],"keep":true}', '{"a":[{"x":[4]},1,2],"keep":true}', false);

-- name: mutated_object_replace
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":{"b":1}}', '{a,b}', '9', true, false, false, '{"a":{}}', '{"a":{"b":9}}', NULL, false);

-- name: mutated_object_insert_conflict
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":{"b":1}}', '{a,b}', '9', true, false, true, '{"a":{}}', '{"a":{"b":9}}', NULL, false);

-- name: mutated_object_insert_missing
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":{}}', '{a,b}', '9', false, false, true, '{"a":{}}', '{"a":{}}', '{"a":{"b":9}}', false);

-- name: mutated_object_create_missing
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":{}}', '{a,b}', '9', true, false, true, '{"a":{}}', '{"a":{"b":9}}', '{"a":{"b":9}}', false);

-- name: mutated_missing_parent
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{}', '{missing,x}', '9', true, false, true, '{}', '{}', '{}', false);

-- name: mutated_skipped_null_segment
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{}', '{missing,NULL}', '9', true, false, true, '{}', '{}', '{}', false);

-- name: mutated_scalar_prefix
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":1}', '{a,x,NULL}', '9', true, false, true, '{"a":1}', '{"a":1}', '{"a":1}', false);

-- name: mutated_reached_null_segment
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":1}', '{a,NULL}', '9', true, false, false, NULL, NULL, NULL, false);

-- name: mutated_empty_no_create
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{}', '{NULL}', '9', false, false, false, '{}', '{}', NULL, false);

-- name: mutated_empty_create_null_error
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{}', '{NULL}', '9', true, false, false, '{}', NULL, NULL, false);

-- name: mutated_empty_array_no_create
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[]', '{bad}', '9', false, false, false, '[]', '[]', NULL, false);

-- name: mutated_bad_index
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2]', '{bad}', '9', true, false, false, NULL, NULL, NULL, false);

-- name: mutated_rank_error
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":1}', '{{a},{b}}', '9', true, false, false, NULL, NULL, NULL, false);

-- name: mutated_scalar_error
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('1', '{}', '9', true, false, false, NULL, NULL, NULL, false);

-- name: mutated_sql_null_document
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES (NULL, '{{a},{b}}', '9', true, false, true, NULL, NULL, NULL, false);

-- name: mutated_sql_null_replacement
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2]', '{0}', NULL, true, false, true, '[2]', NULL, NULL, false);

-- name: mutated_sql_null_flags
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2]', '{0}', '9', NULL, NULL, true, '[2]', NULL, NULL, false);

-- name: mutated_sql_null_path
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2]', NULL, '9', true, false, true, NULL, NULL, NULL, false);

-- name: mutated_empty_path
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":1}', '{}', '9', true, false, true, '{"a":1}', '{"a":1}', '{"a":1}', false);

-- name: mutated_path_bounds
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"a":{"b":1}}', '[0:1]={a,b}', '9', true, false, false, '{"a":{}}', '{"a":{"b":9}}', NULL, false);

-- name: mutated_unicode_key
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('{"雪":{"😊":1}}', '{雪,😊}', '9', true, false, false, '{"雪":{}}', '{"雪":{"😊":9}}', NULL, false);

-- name: mutated_skipped_errors
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('1', '{{a},{b}}', '9', true, false, true, NULL, NULL, NULL, true);

-- name: mutated_wrong_delete
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{1}', '9', false, false, true, '"wrong"', '[1,9,3]', '[1,9,2,3]', false);

-- name: mutated_wrong_set
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{1}', '9', false, false, true, '[1,3]', '"wrong"', '[1,9,2,3]', false);

-- name: mutated_wrong_insert
INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{1}', '9', false, false, true, '[1,3]', '[1,9,3]', '"wrong"', false);

-- name: mutated_null_json
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'use_json_null', '{"a":null}', '{"a":null}', true, false);

-- name: mutated_null_delete
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'delete_key', '{}', '{"a":null}', true, false);

-- name: mutated_null_return
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'return_target', '{"a":1}', '{"a":null}', true, false);

-- name: mutated_null_raise
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'raise_exception', NULL, NULL, false, false);

-- name: mutated_null_bad_policy
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'bad', NULL, NULL, false, false);

-- name: mutated_null_policy_null
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', '9', true, NULL, NULL, NULL, false, false);

-- name: mutated_nonnull_ignores_policy
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', '9', true, 'bad', '{"a":9}', '{"a":9}', true, false);

-- name: mutated_return_skips_rank
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('1', '{{a},{b}}', NULL, true, 'return_target', '1', NULL, false, false);

-- name: mutated_return_skips_null_cell
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{NULL}', NULL, true, 'return_target', '{"a":1}', NULL, false, false);

-- name: mutated_raise_precedes_rank
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('1', '{{a},{b}}', NULL, true, 'raise_exception', NULL, NULL, false, false);

-- name: mutated_delete_array
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('[1,2]', '{0}', NULL, false, 'delete_key', '[2]', '[null,2]', true, false);

-- name: mutated_null_flag
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('1', '{{a},{b}}', NULL, NULL, NULL, NULL, NULL, true, false);

-- name: mutated_null_source
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES (NULL, '{NULL}', NULL, true, NULL, NULL, NULL, true, false);

-- name: mutated_null_skipped
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('1', '{{a},{b}}', NULL, true, NULL, NULL, NULL, true, true);

-- name: mutated_null_wrong_policy
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'delete_key', '{"a":1}', '{"a":null}', true, false);

-- name: mutated_null_wrong_default
INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'delete_key', '{}', '{}', true, false);

-- name: mutated_import_path
INSERT INTO lane_document_edit_imports (document, path, replacement, create_missing, policy, expected, bypass)
VALUES ('{"a":1}', '{a}', '9', true, 'use_json_null', '{"a":9}', false);

-- name: mutated_import_bad_path
INSERT INTO lane_document_edit_imports (document, path, replacement, create_missing, policy, expected, bypass)
VALUES ('{"a":1}', 'bad', '9', true, 'use_json_null', NULL, false);

-- name: mutated_import_skipped
INSERT INTO lane_document_edit_imports (document, path, replacement, create_missing, policy, expected, bypass)
VALUES ('{"a":1}', 'bad', '9', true, 'use_json_null', NULL, true);

-- name: removed_object_keys
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2,"nested":{"a":3}}', '{a,b}', 'a', 'b', '{"nested":{"a":3}}', '{"nested":{"a":3}}', '{"b":2,"nested":{"a":3}}', false);

-- name: removed_null_key
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '{NULL,a}', NULL, 'a', '{"b":2}', '{"b":2}', NULL, false);

-- name: removed_empty_keys
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '{}', 'a', 'b', '{"a":1,"b":2}', '{}', '{"b":2}', false);

-- name: removed_all_null_keys
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1}', '{NULL,NULL}', NULL, NULL, '{"a":1}', '{"a":1}', NULL, false);

-- name: removed_array_strings
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('["a","b","a",1,null,{"a":1}]', '{a,b}', 'a', 'b', '[1,null,{"a":1}]', '[1,null,{"a":1}]', '["b",1,null,{"a":1}]', false);

-- name: removed_array_non_strings
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('[1,null,{}]', '{a,NULL}', 'a', NULL, '[1,null,{}]', '[1,null,{}]', '[1,null,{}]', false);

-- name: removed_duplicate_keys
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '{a,a}', 'a', 'a', '{"b":2}', '{"b":2}', '{"b":2}', false);

-- name: removed_bound_keys
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '[0:1]={a,b}', 'a', 'b', '{}', '{}', '{"b":2}', false);

-- name: removed_unicode_keys
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"雪":1,"😊":2,"a":3}', '{雪,😊}', '雪', '😊', '{"a":3}', '{"a":3}', '{"😊":2,"a":3}', false);

-- name: removed_empty_object
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{}', '{a,NULL}', 'a', NULL, '{}', '{}', '{}', false);

-- name: removed_outer_null
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES (NULL, '{a}', 'a', 'b', NULL, NULL, NULL, false);

-- name: removed_null_array
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1}', NULL, 'a', 'b', NULL, '{}', '{}', false);

-- name: removed_rank_error
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1}', '{{a},{b}}', 'a', 'b', NULL, '{}', '{}', false);

-- name: removed_scalar_error
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('1', '{a}', 'a', 'b', NULL, NULL, NULL, false);

-- name: removed_skipped_errors
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('1', '{{a},{b}}', 'a', 'b', NULL, NULL, NULL, true);

-- name: removed_wrong_bulk
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '{a,b}', 'a', 'b', '{"a":1}', '{}', '{"b":2}', false);

-- name: removed_wrong_expanded
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '{a,b}', 'a', 'b', '{}', '{"a":1}', '{"b":2}', false);

-- name: removed_wrong_scalar
INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2}', '{a,b}', 'a', 'b', '{}', '{}', '{}', false);

-- name: object_pairs_flat
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_empty
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', false);

-- name: object_pairs_matrix
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{{a,1},{b,2}}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_bounds
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('[-2:-1][0:1]={{a,1},{b,2}}', '[0:1]={a,b}', '[-3:-2]={1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_duplicates
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,a,2}', '{a,a}', '{1,2}', '{"a" : "1", "a" : "2"}', '{"a" : "1", "a" : "2"}', '{"a":"2"}', '{"a":"2"}', false);

-- name: object_pairs_order
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{b,1,a,2}', '{b,a}', '{1,2}', '{"b" : "1", "a" : "2"}', '{"b" : "1", "a" : "2"}', '{"b":"1","a":"2"}', '{"b":"1","a":"2"}', false);

-- name: object_pairs_null_values
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,NULL,b,"null"}', '{a,b}', '{NULL,"null"}', '{"a" : null, "b" : "null"}', '{"a" : null, "b" : "null"}', '{"a":null,"b":"null"}', '{"a":null,"b":"null"}', false);

-- name: object_pairs_unicode
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{雪,😊,a,1}', '{雪,a}', '{😊,1}', '{"雪" : "😊", "a" : "1"}', '{"雪" : "😊", "a" : "1"}', '{"雪":"😊","a":"1"}', '{"雪":"😊","a":"1"}', false);

-- name: object_pairs_empty_key
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{"",value}', '{""}', '{value}', '{"" : "value"}', '{"" : "value"}', '{"":"value"}', '{"":"value"}', false);

-- name: object_pairs_null_source
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES (NULL, '{a,b}', '{1,2}', NULL, '{"a" : "1", "b" : "2"}', NULL, '{"a":"1","b":"2"}', false);

-- name: object_pairs_null_keys
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', NULL, '{{1,2}}', '{"a" : "1", "b" : "2"}', NULL, '{"a":"1","b":"2"}', NULL, false);

-- name: object_pairs_null_contents
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', NULL, '{"a" : "1", "b" : "2"}', NULL, '{"a":"1","b":"2"}', NULL, false);

-- name: object_pairs_null_key
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{NULL,1}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_arrays_null_key
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,NULL}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_odd
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_columns
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{{a},{b}}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_rank
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{{{a,1}}}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_arrays_rank
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{{a,b}}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_arrays_rank_mismatch
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_arrays_length
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_shape_before_null
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{{NULL,1,b},{a,2,c}}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_skipped
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{{{NULL,1}}}', '{{a,b}}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', true);

-- name: object_pairs_wrong_raw
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', '{1,2}', '{}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_arrays_wrong_raw
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

-- name: object_pairs_wrong_binary
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{}', '{"a":"1","b":"2"}', false);

-- name: object_arrays_wrong_binary
INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{}', false);

-- name: object_import_pairs
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('{a,1}', '{"a" : "1"}', '{"a":"1"}', false);

-- name: object_import_null
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES (NULL, NULL, NULL, false);

-- name: object_import_bad
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('bad', NULL, NULL, false);

-- name: object_import_odd
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('{a}', NULL, NULL, false);

-- name: object_import_skip
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('bad', NULL, NULL, true);

-- name: object_import_wrong_raw
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('{a,1}', '{}', '{"a":"1"}', false);

-- name: object_import_wrong_binary
INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('{a,1}', '{"a" : "1"}', '{}', false);

-- name: stripped_object
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"b":1}', false, true, '{"b":1}', '{"b":1}', '{"b":1}', false);

-- name: stripped_null_source
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES (NULL, true, true, NULL, NULL, NULL, false);

-- name: stripped_json_null
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES (' null ', true, true, 'null', 'null', 'null', false);

-- name: stripped_number
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES (' 1.00e+02 ', true, true, '1.00e+02', '1.00e+02', '1.00e+02', false);

-- name: stripped_large_number
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('1e999999', true, true, '1e999999', '1e999999', '1e999999', false);

-- name: stripped_string
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('"\u0061\/\n"', true, true, '"a/\n"', '"a/\n"', '"a/\n"', false);

-- name: stripped_empty_object
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{}', true, true, '{}', '{}', '{}', false);

-- name: stripped_empty_array
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('[]', true, true, '[]', '[]', '[]', false);

-- name: stripped_all_fields
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"b":null}', true, true, '{}', '{}', '{}', false);

-- name: stripped_array_default
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('[null,1,null]', false, true, '[null,1,null]', '[null,1,null]', '[1]', false);

-- name: stripped_array_flag
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('[null,1,null]', true, true, '[null,1,null]', '[1]', '[1]', false);

-- name: stripped_array_null_flag
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('[null,1,null]', NULL, true, '[null,1,null]', NULL, NULL, false);

-- name: stripped_first_duplicate
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"a":1}', true, true, '{"a":1}', '{"a":1}', '{"a":1}', false);

-- name: stripped_last_duplicate
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":1,"a":null}', true, true, '{"a":1}', '{"a":1}', '{"a":1}', false);

-- name: stripped_retained_duplicates
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":1,"a":2,"a":null}', true, true, '{"a":1,"a":2}', '{"a":1,"a":2}', '{"a":1,"a":2}', false);

-- name: stripped_nested
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":{"x":null},"b":[null,{"y":null}]}', true, true, '{"a":{},"b":[null,{}]}', '{"a":{},"b":[{}]}', '{"a":{},"b":[{}]}', false);

-- name: stripped_containers
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('[null,[],{},[null]]', true, true, '[null,[],{},[null]]', '[[],{},[]]', '[[],{},[]]', false);

-- name: stripped_escaped_key
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"\u0061":null,"b":"\u0042"}', true, true, '{"b":"B"}', '{"b":"B"}', '{"b":"B"}', false);

-- name: stripped_unicode_key
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"\u00e9":null,"a":"\ud83d\ude0a"}', true, true, '{"a":"😊"}', '{"a":"😊"}', '{"a":"😊"}', false);

-- name: stripped_unicode_source
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"雪":null,"a":"😊"}', true, true, '{"a":"😊"}', '{"a":"😊"}', '{"a":"😊"}', false);

-- name: stripped_zero_key
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"\u0000":null}', true, true, NULL, NULL, NULL, false);

-- name: stripped_surrogate
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"bad":"\ud800x"}', true, true, NULL, NULL, NULL, false);

-- name: stripped_null_before_decoding
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"\u0000":null}', NULL, false, NULL, NULL, NULL, false);

-- name: stripped_skipped
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"\u0000":null}', true, true, NULL, NULL, NULL, true);

-- name: stripped_wrong_default
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"b":1}', true, true, '{}', '{"b":1}', '{"b":1}', false);

-- name: stripped_wrong_explicit
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"b":1}', true, true, '{"b":1}', '{}', '{"b":1}', false);

-- name: stripped_wrong_composed
INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"b":1}', true, true, '{"b":1}', '{"b":1}', '{}', false);

-- name: stripped_import_valid
INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES (' { "a" : null, "b" : [null,1] } ', true, '{"b":[1]}', false);

-- name: stripped_import_bad
INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES ('bad', true, NULL, false);

-- name: stripped_import_bad_null_flag
INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES ('bad', NULL, NULL, false);

-- name: stripped_import_skipped
INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES ('bad', true, NULL, true);

-- name: stripped_import_null
INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES (NULL, true, NULL, false);

-- name: stripped_import_wrong
INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES ('{"a":null}', true, '{"a":null}', false);

-- name: encoded_unicode_scalar
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u00e9"', '"\u00e9"', 1, '"é"', '["é"]', '["é",1]', false);

-- name: encoded_unicode_keys
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('{"\u00e9":1,"雪":2}', '{"\u00e9":1,"雪":2}', 1, '{"é":1,"雪":2}', '[{"é":1,"雪":2}]', '[{"é":1,"雪":2},1]', false);

-- name: encoded_unicode_pair
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\ud83d\ude0a"', '"\ud83d\ude0a"', 1, '"😊"', '["😊"]', '["😊",1]', false);

-- name: encoded_json_null
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('null', 'null', 1, 'null', '[null]', '[null,1]', false);

-- name: encoded_sql_null
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES (NULL, NULL, 1, NULL, '[null]', '[null,1]', false);

-- name: encoded_zero_error
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u0000"', '"\u0000"', 1, NULL, NULL, NULL, false);

-- name: encoded_surrogate_error
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\ud800"', '"\ud800"', 1, NULL, NULL, NULL, false);

-- name: encoded_eager_error
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u00e9"', '"\u00e9"', 0, '"é"', '["é"]', NULL, false);

-- name: encoded_bad_text
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('{}', 'bad', 1, '{}', '[{}]', '[{},1]', false);

-- name: encoded_skipped
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u0000"', 'bad', 0, NULL, NULL, NULL, true);

-- name: encoded_wrong_scalar
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u00e9"', '"\u00e9"', 1, '{}', '["é"]', '["é",1]', false);

-- name: encoded_wrong_array
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u00e9"', '"\u00e9"', 1, '"é"', '{}', '["é",1]', false);

-- name: encoded_wrong_eager
INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u00e9"', '"\u00e9"', 1, '"é"', '["é"]', '[]', false);

-- name: json_arrays_source
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_compact
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', false, '[1,null,2]', '[1,null,2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_null_flag
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', NULL, '[1,null,2]', NULL, '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_matrix
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[0:1][5:6]={{1,2},{3,NULL}}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[[1,2],[3,null]]', '[[1,2],
 [3,null]]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_rank_six
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('{{{{{{1,2}}}}}}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[[[[[[1,2]]]]]]', '[[[[[[1,2]]]]]]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_empty
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('{}', '{}', '{}', '{}', '{}', true, '[]', '[]', '[]', '[]', '[]', '[]', false);

-- name: json_arrays_null
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, false);

-- name: json_arrays_null_cells
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('{NULL,NULL}', '{NULL,NULL}', '{NULL,NULL}', '{NULL,NULL}', '{NULL,NULL}', true, '[null,null]', '[null,
 null]', '[null,null]', '[null,null]', '[null,null]', '[null,
 null]', false);

-- name: json_arrays_escaped_labels
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"quote\"\\","line
text"}', true, '[1,null,2]', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["quote\"\\",
 "line\ntext"]', false);

-- name: json_arrays_skipped
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, 'wrong', 'wrong', 'wrong', 'wrong', 'wrong', 'wrong', true);

-- name: json_arrays_wrong_slots
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, 'wrong', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_wrong_pretty
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', 'wrong', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_wrong_documents
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', '[1,
 null,
 2]', 'wrong', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_wrong_binary
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', 'wrong', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_wrong_amounts
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', 'wrong', '["a",
 "雪😊",
 null]', false);

-- name: json_arrays_wrong_labels
INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', 'wrong', false);

-- name: json_scalar_values
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', '{"a": 3, "aa": 2, "é": 1}', '1.2300', '"雪😊"', 'true', '"12:34:56.123456"', false);

-- name: json_scalar_null
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);

-- name: json_scalar_raw_escape
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES ('"\u0000"', 'null', 'NaN', 'null', false, '24:00', '"\u0000"', 'null', '"NaN"', '"null"', 'false', '"24:00:00"', false);

-- name: json_scalar_large_source
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES ('1e999999', '{}', '-0.000', 'line
text', true, '00:00', '1e999999', '{}', '0.000', '"line\ntext"', 'true', '"00:00:00"', false);

-- name: json_scalar_wrong_document
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', 'wrong', '{"a": 3, "aa": 2, "é": 1}', '1.2300', '"雪😊"', 'true', '"12:34:56.123456"', false);

-- name: json_scalar_wrong_binary
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', 'wrong', '1.2300', '"雪😊"', 'true', '"12:34:56.123456"', false);

-- name: json_scalar_wrong_amount
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', '{"a": 3, "aa": 2, "é": 1}', 'wrong', '"雪😊"', 'true', '"12:34:56.123456"', false);

-- name: json_scalar_wrong_label
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', '{"a": 3, "aa": 2, "é": 1}', '1.2300', 'wrong', 'true', '"12:34:56.123456"', false);

-- name: json_scalar_wrong_flag
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', '{"a": 3, "aa": 2, "é": 1}', '1.2300', '"雪😊"', 'wrong', '"12:34:56.123456"', false);

-- name: json_scalar_wrong_clock
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', '{"a": 3, "aa": 2, "é": 1}', '1.2300', '"雪😊"', 'true', 'wrong', false);

-- name: json_scalar_skipped
INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', 'wrong', '{"a": 3, "aa": 2, "é": 1}', '1.2300', '"雪😊"', 'true', '"12:34:56.123456"', true);

-- name: json_conversion_imported
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('{" { \"a\":1,\"a\":2 } ",NULL}', true, '[ { "a":1,"a":2 } ,
 null]', false);

-- name: json_conversion_import_bad
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('bad', true, NULL, false);

-- name: json_conversion_import_bad_null_flag
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('bad', NULL, NULL, false);

-- name: json_conversion_import_bad_cell
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('{"bad"}', true, NULL, false);

-- name: json_conversion_import_skipped
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('bad', true, NULL, true);

-- name: json_conversion_import_null
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES (NULL, true, NULL, false);

-- name: json_conversion_import_wrong
INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('{1,NULL}', false, '[]', false);

-- name: raw_build_mixed
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', '{}', false);

-- name: raw_build_null_values
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, '[null, null, null, null, null, null]', '{"label" : null, "number" : null, "flag" : null, "document" : null, "binary" : null}', NULL, NULL, '[]', '{}', false);

-- name: raw_build_raw_escape
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('null', '-0.000', false, '"\u0000"', 'null', '雪', '😊', true, '["null", 0.000, false, "\u0000", null, null]', '{"label" : "null", "number" : 0.000, "flag" : false, "document" : "\u0000", "binary" : null}', '{"雪" : 1, "😊" : 2}', '{"false" : "\u0000", "0.000" : "null"}', '[]', '{}', false);

-- name: raw_build_large_source
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('"\
', 'NaN', true, '1e999999', '{}', '', 'a', true, '["\"\\\n", "NaN", true, 1e999999, {}, null]', '{"label" : "\"\\\n", "number" : "NaN", "flag" : true, "document" : 1e999999, "binary" : {}}', '{"" : 1, "a" : 2}', '{"true" : 1e999999, "NaN" : "\"\\\n"}', '[]', '{}', false);

-- name: raw_build_null_first
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('x', '1', true, '1', '1', NULL, 'a', true, '["x", 1, true, 1, 1, null]', '{"label" : "x", "number" : 1, "flag" : true, "document" : 1, "binary" : 1}', NULL, '{"true" : 1, "1" : "x"}', '[]', '{}', false);

-- name: raw_build_null_second
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('x', '1', true, '1', '1', 'a', NULL, true, '["x", 1, true, 1, 1, null]', '{"label" : "x", "number" : 1, "flag" : true, "document" : 1, "binary" : 1}', NULL, '{"true" : 1, "1" : "x"}', '[]', '{}', false);

-- name: raw_build_null_flag
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('x', '1', NULL, '1', '1', 'a', 'a', true, '["x", 1, null, 1, 1, null]', '{"label" : "x", "number" : 1, "flag" : null, "document" : 1, "binary" : 1}', '{"a" : 1, "a" : 2}', NULL, '[]', '{}', false);

-- name: raw_build_null_amount
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('x', NULL, true, '1', '1', 'a', 'a', true, '["x", null, true, 1, 1, null]', '{"label" : "x", "number" : null, "flag" : true, "document" : 1, "binary" : 1}', '{"a" : 1, "a" : 2}', NULL, '[]', '{}', false);

-- name: raw_build_wrong_array
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, 'wrong', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', '{}', false);

-- name: raw_build_wrong_object
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', 'wrong', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', '{}', false);

-- name: raw_build_wrong_duplicate
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', 'wrong', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', '{}', false);

-- name: raw_build_wrong_keys
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', 'wrong', '[]', '{}', false);

-- name: raw_build_wrong_empty_array
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', 'wrong', '{}', false);

-- name: raw_build_wrong_empty_object
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', 'wrong', false);

-- name: raw_build_skipped
INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', NULL, 'a', true, 'wrong', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', '{}', true);

-- name: raw_build_array_values
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{a,1,a,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '[[1,null,2], null]', '[1, null, 2]', '{"a" : "1", "a" : "2"}', '[ { "a":1,"a":2 } , "\u0000", 1e999999, null]', false);

-- name: raw_build_array_empty
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('{}', '{}', '{}', '[[], null]', '[]', '{}', '[]', false);

-- name: raw_build_array_null
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES (NULL, NULL, NULL, '[null, null]', NULL, NULL, NULL, false);

-- name: raw_build_array_null_cells
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('{NULL,NULL}', '{a,NULL}', '{NULL,NULL}', '[[null,null], null]', '[null, null]', '{"a" : null}', '[null, null]', false);

-- name: raw_build_array_matrix
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:1][5:6]={{1,2},{3,NULL}}', '{{a,1},{a,2}}', '{"1","null"}', '[[[1,2],[3,null]], null]', '[1, 2, 3, null]', '{"a" : "1", "a" : "2"}', '[1, null]', false);

-- name: raw_build_array_odd
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('{1}', '{a,1,b}', '{}', '[[1], null]', '[1]', NULL, '[]', false);

-- name: raw_build_array_null_key
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('{1}', '{NULL,1}', '{}', '[[1], null]', '[1]', NULL, '[]', false);

-- name: raw_build_array_unicode
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('{1}', '{雪,😊}', '{"\"雪\"","\"😊\""}', '[[1], null]', '[1]', '{"雪" : "😊"}', '["雪", "😊"]', false);

-- name: raw_build_array_wrong_nested
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{a,1,a,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', 'wrong', '[1, null, 2]', '{"a" : "1", "a" : "2"}', '[ { "a":1,"a":2 } , "\u0000", 1e999999, null]', false);

-- name: raw_build_array_wrong_flattened
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{a,1,a,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '[[1,null,2], null]', 'wrong', '{"a" : "1", "a" : "2"}', '[ { "a":1,"a":2 } , "\u0000", 1e999999, null]', false);

-- name: raw_build_array_wrong_object
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{a,1,a,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '[[1,null,2], null]', '[1, null, 2]', 'wrong', '[ { "a":1,"a":2 } , "\u0000", 1e999999, null]', false);

-- name: raw_build_array_wrong_documents
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{a,1,a,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '[[1,null,2], null]', '[1, null, 2]', '{"a" : "1", "a" : "2"}', 'wrong', false);

-- name: raw_build_array_skipped
INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{NULL,1}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '[[1,null,2], null]', '[1, null, 2]', '{"a" : "1", "a" : "2"}', '[ { "a":1,"a":2 } , "\u0000", 1e999999, null]', true);

-- name: raw_build_import
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('{"\"\\u0000\"",NULL}', 1, '[["\u0000",null], 1]', '{"values" : ["\u0000",null], "count" : 1}', false);

-- name: raw_build_import_bad
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('bad', 1, NULL, NULL, false);

-- name: raw_build_import_bad_before_division
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('bad', 0, NULL, NULL, false);

-- name: raw_build_import_eager
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('{"\"\\u0000\""}', 0, NULL, NULL, false);

-- name: raw_build_import_null
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES (NULL, 1, '[null, 1]', '{"values" : null, "count" : 1}', false);

-- name: raw_build_import_skipped
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('bad', 0, NULL, NULL, true);

-- name: raw_build_import_wrong_array
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('{1,NULL}', 1, '[]', '{"values" : [1,null], "count" : 1}', false);

-- name: raw_build_import_wrong_object
INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('{1,NULL}', 1, '[[1,null], 1]', '{}', false);

-- name: numeric_import_scale
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('+1.2300', '2.500', '1.2300', '[1.2300,2.500,null]', '[1.23,2.5,null]', '1.23', '[1.2300, 2.500, null]', false);

-- name: numeric_import_radix
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('0x_FF', '-0b10_1', '255', '[255,-5,null]', '[255,-5,null]', '255.00', '[255, -5, null]', false);

-- name: numeric_import_separators
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1_2.3_400', '0o7_7', '12.3400', '[12.3400,63,null]', '[12.34,63,null]', '12.34', '[12.3400, 63, null]', false);

-- name: numeric_import_negative_zero
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('-0.000', '-2.50', '0.000', '[0.000,-2.50,null]', '[0,-2.5,null]', '0.00', '[0.000, -2.50, null]', false);

-- name: numeric_import_round_carry
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('99.9995', '.5e1', '99.9995', '[99.9995,5,null]', '[99.9995,5,null]', '100.00', '[99.9995, 5, null]', false);

-- name: numeric_import_null
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES (NULL, '2.500', NULL, '[null,2.500,null]', '[null,2.5,null]', NULL, '[null, 2.500, null]', false);

-- name: numeric_import_all_null
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES (NULL, NULL, NULL, '[null,null,null]', '[null,null,null]', NULL, '[null, null, null]', false);

-- name: numeric_import_nan
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('NaN', '2.500', 'NaN', '["NaN",2.500,null]', '["NaN",2.5,null]', 'NaN', '["NaN", 2.500, null]', false);

-- name: numeric_import_infinity_precision
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('Infinity', '2.500', 'Infinity', '["Infinity",2.500,null]', '["Infinity",2.5,null]', NULL, '["Infinity", 2.500, null]', false);

-- name: numeric_import_precision_overflow
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('9999.995', '2.500', '9999.995', '[9999.995,2.500,null]', '[9999.995,2.5,null]', NULL, '[9999.995, 2.500, null]', false);

-- name: numeric_import_bad_syntax
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1__2', '2.500', NULL, NULL, NULL, NULL, NULL, false);

-- name: numeric_import_input_overflow
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1e131072', '2.500', NULL, NULL, NULL, NULL, NULL, false);

-- name: numeric_import_input_scale_overflow
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1e-16384', '2.500', NULL, NULL, NULL, NULL, NULL, false);

-- name: numeric_import_bad_alternate
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1.2300', 'bad', '1.2300', NULL, NULL, '1.23', NULL, false);

-- name: numeric_import_skipped
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('bad', 'bad', NULL, NULL, NULL, NULL, NULL, true);

-- name: numeric_import_wrong_text
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1.2300', '2.500', '1.23', '[1.2300,2.500,null]', '[1.23,2.5,null]', '1.23', '[1.2300, 2.500, null]', false);

-- name: numeric_import_wrong_array
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1.2300', '2.500', '1.2300', '[]', '[1.23,2.5,null]', '1.23', '[1.2300, 2.500, null]', false);

-- name: numeric_import_wrong_binary
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1.2300', '2.500', '1.2300', '[1.2300,2.500,null]', '[]', '1.23', '[1.2300, 2.500, null]', false);

-- name: numeric_import_wrong_rounding
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1.2300', '2.500', '1.2300', '[1.2300,2.500,null]', '[1.23,2.5,null]', '1.24', '[1.2300, 2.500, null]', false);

-- name: numeric_import_wrong_raw
INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('1.2300', '2.500', '1.2300', '[1.2300,2.500,null]', '[1.23,2.5,null]', '1.23', '[]', false);

-- name: array_io_radix_and_scales
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('[0:1]={0x_FF,1.2300}', '[0:1]={1.2300,-0.000}', '[0:1]={new,done}', '[0:1]={255,1.2300}', '[0:1]={1.2300,0.000}', '[0:1]={new,done}', '[0:1]={255.0,1.2}', '[0:1]', false);

-- name: array_io_null_arrays
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);

-- name: array_io_empty_arrays
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', NULL, false);

-- name: array_io_null_cells
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{NULL,1.2300}', '{NULL,-0.000}', '{NULL,new}', '{NULL,1.2300}', '{NULL,0.000}', '{NULL,new}', '{NULL,1.2}', '[1:2]', false);

-- name: array_io_matrix_bounds
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('[-2:-1][3:4]={{1.2300,NULL},{-2.5500,0o7_7}}', '[-2:-1][3:4]={{1.2300,NULL},{-2.5500,63}}', '[-2:-1][3:4]={{new,NULL},{done,new}}', '[-2:-1][3:4]={{1.2300,NULL},{-2.5500,63}}', '[-2:-1][3:4]={{1.2300,NULL},{-2.5500,63}}', '[-2:-1][3:4]={{new,NULL},{done,new}}', '[-2:-1][3:4]={{1.2,NULL},{-2.6,63.0}}', '[-2:-1][3:4]', false);

-- name: array_io_nan
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{NaN,-0.000}', '{NaN,-0.000}', '{new,done}', '{NaN,0.000}', '{NaN,0.000}', '{new,done}', '{NaN,0.0}', '[1:2]', false);

-- name: array_io_bad_input
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{bad}', '{}', '{}', NULL, '{}', '{}', NULL, '[1:1]', false);

-- name: array_io_precision_before_later_input
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{9999,bad}', '{}', '{}', NULL, '{}', '{}', NULL, '[1:2]', false);

-- name: array_io_input_before_later_precision
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{bad,9999}', '{}', '{}', NULL, '{}', '{}', NULL, '[1:2]', false);

-- name: array_io_skipped
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{bad}', '{Infinity}', '{new}', NULL, NULL, NULL, NULL, NULL, true);

-- name: array_io_wrong_numeric
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{1.2300}', '{1.2300}', '{new}', '{2}', '{1.2300}', '{new}', '{1.2}', '[1:1]', false);

-- name: array_io_wrong_text_scale
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{1.2300}', '{1.2300}', '{new}', '{1.2300}', '{1.23}', '{new}', '{1.2}', '[1:1]', false);

-- name: array_io_wrong_enum_labels
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{1.2300}', '{1.2300}', '{new}', '{1.2300}', '{1.2300}', '{done}', '{1.2}', '[1:1]', false);

-- name: array_io_wrong_precision
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('{1.2300}', '{1.2300}', '{new}', '{1.2300}', '{1.2300}', '{new}', '{1.3}', '[1:1]', false);

-- name: array_io_wrong_bounds
INSERT INTO lane_array_imports (labels, numeric_values, stages, expected_numeric, expected_text, expected_stages, expected_rounded, expected_bounds, bypass)
VALUES ('[0:0]={1.2300}', '{1.2300}', '{new}', '[0:0]={1.2300}', '{1.2300}', '{new}', '[0:0]={1.2}', '[1:1]', false);

-- name: computed_elements_valid
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('1.2300',2,3,false,'[1:1]',true,false);

-- name: computed_elements_selected
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('2',2,3,true,'[1:1]',true,false);

-- name: computed_elements_null_payload
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES (NULL,2,3,false,'[1:1]',true,false);

-- name: computed_elements_all_null
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES (NULL,NULL,NULL,NULL,'[1:1]',true,false);

-- name: computed_elements_bad_input
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('bad',2,3,false,'[1:1]',true,false);

-- name: computed_elements_skipped_parse_branch
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('bad',2,3,true,'[1:1]',true,false);

-- name: computed_elements_division_error
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('1',0,3,false,'[1:1]',true,false);

-- name: computed_elements_earlier_parse_error
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('bad',0,3,false,'[1:1]',true,false);

-- name: computed_elements_skipped
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('bad',0,3,false,'wrong',false,true);

-- name: computed_elements_wrong_shape
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('1',2,3,false,'wrong',true,false);

-- name: computed_elements_wrong_fetch
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('1',2,3,false,'[1:1]',false,false);

-- name: computed_elements_missing_shape
INSERT INTO lane_computed_slots (payload, quantity, other, flag, expected_dimensions, expected_fetch, bypass)
VALUES ('1',2,3,false,NULL,true,false);

-- name: cast_slots_valid
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'雪😊abcd','2000-01-01',false,'[1:1]',true);

-- name: cast_slots_negative
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (-99,32767,'long label','2024-01-01',false,'[1:1]',true);

-- name: cast_slots_nulls
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (NULL,NULL,NULL,NULL,false,'[1:1]',true);

-- name: cast_slots_infinity
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'label','infinity',false,'[1:1]',true);

-- name: cast_slots_negative_infinity
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'label','-infinity',false,'[1:1]',true);

-- name: cast_slots_narrow_error
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (32768,1,'label','2000-01-01',false,'[1:1]',true);

-- name: cast_slots_later_narrow_error
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,32768,'label','2000-01-01',false,'[1:1]',true);

-- name: cast_slots_negative_narrow_error
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (-32769,1,'label','2000-01-01',false,'[1:1]',true);

-- name: cast_slots_scale_error
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (100,1,'label','2000-01-01',false,'[1:1]',true);

-- name: cast_slots_context_range_error
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'label','5000000-01-01',false,'[1:1]',true);

-- name: cast_slots_skipped
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (32768,32768,'label','5000000-01-01',true,'wrong',false);

-- name: cast_slots_wrong_shape
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'label','2000-01-01',false,'wrong',true);

-- name: cast_slots_wrong_null
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'label','2000-01-01',false,'[1:1]',false);

-- name: cast_slots_missing_shape
INSERT INTO lane_cast_slots (quantity, other, label, calendar, bypass, expected_dimensions, expected_null)
VALUES (1,2,'label','2000-01-01',false,NULL,true);

-- name: extrema_value_order
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}','{2}','{2}','{1}','[1:1]','[1:1]',false);

-- name: extrema_null_cells
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{NULL}','{1}','{NULL}','{1}','[1:1]','[1:1]',false);

-- name: extrema_bounds
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('[0:1]={1,2}','{1,2}','{1,2}','[0:1]={1,2}','[1:2]','[0:1]',false);

-- name: extrema_rank
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1,2}','{{1,2}}','{{1,2}}','{1,2}','[1:1][1:2]','[1:2]',false);

-- name: extrema_empty
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{}','{}','{}','{}',NULL,NULL,false);

-- name: extrema_null_left
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES (NULL,'{1}',NULL,NULL,NULL,NULL,false);

-- name: extrema_null_right
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}',NULL,NULL,NULL,NULL,NULL,false);

-- name: extrema_skipped
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}','{2}','{}','{}','wrong','wrong',true);

-- name: extrema_wrong_larger
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}','{2}','{1}','{1}','[1:1]','[1:1]',false);

-- name: extrema_wrong_smaller
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}','{2}','{2}','{2}','[1:1]','[1:1]',false);

-- name: extrema_wrong_larger_bounds
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}','{2}','{2}','{1}','wrong','[1:1]',false);

-- name: extrema_wrong_smaller_bounds
INSERT INTO lane_extreme_slots (slots, standby, expected_larger, expected_smaller, larger_layout, smaller_layout, bypass)
VALUES ('{1}','{2}','{2}','{1}','[1:1]','wrong',false);

-- name: extrema_precision_tie
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1.00}','{1.0}','{1.0}','{1.0}',false);

-- name: extrema_precision_reverse_tie
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1.0}','{1.00}','{1.00}','{1.00}',false);

-- name: extrema_precision_order
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1.00}','{2.000}','{2.000}','{1.00}',false);

-- name: extrema_precision_null
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES (NULL,'{2.000}',NULL,NULL,false);

-- name: extrema_precision_nan
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{NaN}','{Infinity}','{NaN}','{Infinity}',false);

-- name: extrema_precision_wrong_larger_tie
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1.00}','{1.0}','{1.00}','{1.0}',false);

-- name: extrema_precision_wrong_smaller_tie
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1.00}','{1.0}','{1.0}','{1.00}',false);

-- name: extrema_precision_skipped
INSERT INTO lane_extreme_precision (amounts, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1.00}','{1.0}','wrong','wrong',true);

-- name: extrema_documents
INSERT INTO lane_extreme_documents (documents, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1}','{2}','{2}','{1}',false);

-- name: extrema_document_null
INSERT INTO lane_extreme_documents (documents, alternate, expected_larger, expected_smaller, bypass)
VALUES (NULL,'{2}',NULL,NULL,false);

-- name: extrema_documents_arrays
INSERT INTO lane_extreme_documents (documents, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{"[1,2]"}','{"[3,4]"}','{"[3,4]"}','{"[1,2]"}',false);

-- name: extrema_documents_wrong_larger
INSERT INTO lane_extreme_documents (documents, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1}','{2}','{1}','{1}',false);

-- name: extrema_documents_wrong_smaller
INSERT INTO lane_extreme_documents (documents, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1}','{2}','{2}','{2}',false);

-- name: extrema_documents_skipped
INSERT INTO lane_extreme_documents (documents, alternate, expected_larger, expected_smaller, bypass)
VALUES ('{1}','{2}','{}','{}',true);

-- name: extrema_unordered_null
INSERT INTO lane_unordered_extrema (documents, alternate, bypass)
VALUES (NULL,'{}',false);

-- name: extrema_unordered_empty
INSERT INTO lane_unordered_extrema (documents, alternate, bypass)
VALUES ('{}','{}',false);

-- name: extrema_unordered_values
INSERT INTO lane_unordered_extrema (documents, alternate, bypass)
VALUES ('{1}','{2}',false);

-- name: extrema_unordered_null_cells
INSERT INTO lane_unordered_extrema (documents, alternate, bypass)
VALUES ('{NULL}','{NULL}',false);

-- name: extrema_unordered_skipped
INSERT INTO lane_unordered_extrema (documents, alternate, bypass)
VALUES ('{1}','{2}',true);

-- name: bucket_assignments_below
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{10,20,30}',5,0,false);

-- name: bucket_assignments_first
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{10,20,30}',10,1,false);

-- name: bucket_assignments_middle
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{10,20,30}',25,2,false);

-- name: bucket_assignments_last
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{10,20,30}',30,3,false);

-- name: bucket_assignments_above
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{10,20,30}',40,3,false);

-- name: bucket_assignments_duplicate
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{1,2,2,2,3}',2,4,false);

-- name: bucket_assignments_unsorted
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{30,10,20}',15,2,false);

-- name: bucket_assignments_lower_bounds
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('[-3:-1]={10,20,30}',20,2,false);

-- name: bucket_assignments_empty
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{}',1,0,false);

-- name: bucket_assignments_null_probe
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{1,NULL}',NULL,NULL,false);

-- name: bucket_assignments_null_array
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES (NULL,1,NULL,false);

-- name: bucket_assignments_null_cell
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{1,NULL}',1,0,false);

-- name: bucket_assignments_multidimensional
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{{1,NULL}}',1,0,false);

-- name: bucket_assignments_wrong
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{10,20,30}',20,1,false);

-- name: bucket_assignments_bypass
INSERT INTO lane_bucket_assignments(thresholds,probe,expected,bypass) VALUES ('{{1,NULL}}',1,0,true);

-- name: decimal_buckets_wide
INSERT INTO lane_decimal_buckets(thresholds,probe,expected,bypass) VALUES ('{9007199254740992,9007199254740993,9007199254740994}',9007199254740993,2,false);

-- name: decimal_buckets_scales
INSERT INTO lane_decimal_buckets(thresholds,probe,expected,bypass) VALUES ('{1.00,1.0,2.00}',1,2,false);

-- name: decimal_buckets_infinities
INSERT INTO lane_decimal_buckets(thresholds,probe,expected,bypass) VALUES ('{-Infinity,0,Infinity,NaN}',0,2,false);

-- name: decimal_buckets_wrong
INSERT INTO lane_decimal_buckets(thresholds,probe,expected,bypass) VALUES ('{1,2,3}',2,1,false);

-- name: decimal_buckets_null_probe
INSERT INTO lane_decimal_buckets(thresholds,probe,expected,bypass) VALUES ('{1,NULL}',NULL,NULL,false);

-- name: named_buckets_unicode
INSERT INTO lane_named_buckets(thresholds,probe,expected,bypass) VALUES ('{a,z,雪,😊}','雪',3,false);

-- name: named_buckets_equal
INSERT INTO lane_named_buckets(thresholds,probe,expected,bypass) VALUES ('{same,same,same}','same',3,false);

-- name: named_buckets_empty
INSERT INTO lane_named_buckets(thresholds,probe,expected,bypass) VALUES ('{}','x',0,false);

-- name: named_buckets_wrong
INSERT INTO lane_named_buckets(thresholds,probe,expected,bypass) VALUES ('{a,z}','z',1,false);

-- name: named_buckets_null_cell
INSERT INTO lane_named_buckets(thresholds,probe,expected,bypass) VALUES ('{a,NULL}','z',0,false);

-- name: stage_buckets_first
INSERT INTO lane_stage_buckets(thresholds,probe,expected,bypass) VALUES ('{new,done}','new',1,false);

-- name: stage_buckets_last
INSERT INTO lane_stage_buckets(thresholds,probe,expected,bypass) VALUES ('{new,done}','done',2,false);

-- name: stage_buckets_duplicates
INSERT INTO lane_stage_buckets(thresholds,probe,expected,bypass) VALUES ('{new,new,done}','new',2,false);

-- name: stage_buckets_wrong
INSERT INTO lane_stage_buckets(thresholds,probe,expected,bypass) VALUES ('{new,done}','done',1,false);

-- name: stage_buckets_null_probe
INSERT INTO lane_stage_buckets(thresholds,probe,expected,bypass) VALUES ('{new,NULL}',NULL,NULL,false);

-- name: document_buckets_numbers
INSERT INTO lane_document_buckets(thresholds,probe,expected,bypass) VALUES ('{1,2,3}','2',2,false);

-- name: document_buckets_json_null
INSERT INTO lane_document_buckets(thresholds,probe,expected,bypass) VALUES ('{"null",1}','null',1,false);

-- name: document_buckets_numeric_equivalence
INSERT INTO lane_document_buckets(thresholds,probe,expected,bypass) VALUES ('{1.00,1.0,2}','1',2,false);

-- name: document_buckets_wrong
INSERT INTO lane_document_buckets(thresholds,probe,expected,bypass) VALUES ('{1,2,3}','2',1,false);

-- name: document_buckets_sql_null
INSERT INTO lane_document_buckets(thresholds,probe,expected,bypass) VALUES ('{1,NULL}','2',0,false);

-- name: unordered_buckets_null
INSERT INTO lane_unordered_buckets(thresholds,probe,bypass) VALUES ('{}',NULL,false);

-- name: unordered_buckets_empty
INSERT INTO lane_unordered_buckets(thresholds,probe,bypass) VALUES ('{}','1',false);

-- name: unordered_buckets_null_cell
INSERT INTO lane_unordered_buckets(thresholds,probe,bypass) VALUES ('{NULL}','1',false);

-- name: unordered_buckets_multidimensional
INSERT INTO lane_unordered_buckets(thresholds,probe,bypass) VALUES ('{{NULL}}','1',false);

-- name: unordered_buckets_values
INSERT INTO lane_unordered_buckets(thresholds,probe,bypass) VALUES ('{1,2}','1',false);

-- name: unordered_buckets_bypass
INSERT INTO lane_unordered_buckets(thresholds,probe,bypass) VALUES ('{NULL}','1',true);

-- name: stage_intervals_all
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('new','done','{new,done}','new','done','[1:2]',false);

-- name: stage_intervals_reversed
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('done','new','{}','new','done',NULL,false);

-- name: stage_intervals_first
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('new','new','{new}','new','done','[1:1]',false);

-- name: stage_intervals_last
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('done','done','{done}','new','done','[1:1]',false);

-- name: stage_intervals_open_lower
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES (NULL,'new','{new}','new','done','[1:1]',false);

-- name: stage_intervals_open_upper
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('done',NULL,'{done}','new','done','[1:1]',false);

-- name: stage_intervals_open_both
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES (NULL,NULL,'{new,done}','new','done','[1:2]',false);

-- name: stage_intervals_wrong_range
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('new','done','{done}','new','done','[1:2]',false);

-- name: stage_intervals_wrong_first
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('new','done','{new,done}','done','done','[1:2]',false);

-- name: stage_intervals_wrong_last
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('new','done','{new,done}','new','new','[1:2]',false);

-- name: stage_intervals_wrong_layout
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('new','done','{new,done}','new','done',NULL,false);

-- name: stage_intervals_bypass
INSERT INTO lane_stage_intervals(stage,upper_stage,expected,expected_first,expected_last,expected_layout,bypass) VALUES ('done','new','{new,done}','done','new','wrong',true);

-- name: degenerate_stages_null
INSERT INTO lane_degenerate_stages(empty_stage,single_stage,bypass) VALUES (NULL,NULL,true);

-- name: degenerate_stages_value
INSERT INTO lane_degenerate_stages(empty_stage,single_stage,bypass) VALUES (NULL,'only',true);

-- name: degenerate_stages_reached_empty
INSERT INTO lane_degenerate_stages(empty_stage,single_stage,bypass) VALUES (NULL,NULL,false);

-- name: stage_catalog_inputs_values
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('{new,done}','new',2,false);

-- name: stage_catalog_inputs_null
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES (NULL,NULL,2,false);

-- name: stage_catalog_inputs_null_cell
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('{NULL}','done',2,false);

-- name: stage_catalog_inputs_multidimensional
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('{{new,done}}','new',2,false);

-- name: stage_catalog_inputs_bad_input
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('bad','new',2,false);

-- name: stage_catalog_inputs_bad_label
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('{bad}','new',2,false);

-- name: stage_catalog_inputs_wrong_count
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('{new}','new',1,false);

-- name: stage_catalog_inputs_bypass
INSERT INTO lane_stage_catalog_inputs(payload,domain_stage,expected_count,bypass) VALUES ('{bad}','new',2,true);

-- name: export_intervals_value
INSERT INTO lane_export_intervals(stage,expected,expected_first,expected_last) VALUES ('new','{done,new}','done','new');

-- name: export_intervals_null
INSERT INTO lane_export_intervals(stage,expected,expected_first,expected_last) VALUES (NULL,'{done,new}','done','new');

-- name: export_intervals_wrong_range
INSERT INTO lane_export_intervals(stage,expected,expected_first,expected_last) VALUES ('new','{new,done}','done','new');

-- name: export_intervals_wrong_first
INSERT INTO lane_export_intervals(stage,expected,expected_first,expected_last) VALUES ('new','{done,new}','new','new');

-- name: export_intervals_wrong_last
INSERT INTO lane_export_intervals(stage,expected,expected_first,expected_last) VALUES ('new','{done,new}','done','done');

-- name: hash_slots_0
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{}','{}','{}','0'::bigint,1::integer,'1'::bigint,1::integer,1::integer,false);
-- name: hash_slots_1
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{}','{}','{}','-1'::bigint,1::integer,'1'::bigint,1::integer,1::integer,false);
-- name: hash_slots_2
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{}','{}','{}','-9223372036854775808'::bigint,1::integer,'1'::bigint,1::integer,1::integer,false);
-- name: hash_slots_3
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{}','{}','{}','9223372036854775807'::bigint,1::integer,'1'::bigint,1::integer,1::integer,false);
-- name: hash_slots_4
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{}','{}','{}',NULL::bigint,1::integer,NULL::bigint,1::integer,1::integer,false);
-- name: hash_slots_5
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','{NULL,NULL}','0'::bigint,961::integer,'961'::bigint,961::integer,961::integer,false);
-- name: hash_slots_6
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','{NULL,NULL}','-1'::bigint,961::integer,'961'::bigint,961::integer,961::integer,false);
-- name: hash_slots_7
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','{NULL,NULL}','-9223372036854775808'::bigint,961::integer,'961'::bigint,961::integer,961::integer,false);
-- name: hash_slots_8
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','{NULL,NULL}','9223372036854775807'::bigint,961::integer,'961'::bigint,961::integer,961::integer,false);
-- name: hash_slots_9
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','{NULL,NULL}',NULL::bigint,961::integer,NULL::bigint,961::integer,961::integer,false);
-- name: hash_slots_10
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,2,3}','{1.00,-0.0,2.5}','{0,-0,1.5}','0'::bigint,'-325393530'::integer,'-8286617039739886714'::bigint,909966589::integer,630889937::integer,false);
-- name: hash_slots_11
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,2,3}','{1.00,-0.0,2.5}','{0,-0,1.5}','-1'::bigint,'-325393530'::integer,'-1009806707943405568'::bigint,909966589::integer,630889937::integer,false);
-- name: hash_slots_12
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,2,3}','{1.00,-0.0,2.5}','{0,-0,1.5}','-9223372036854775808'::bigint,'-325393530'::integer,'6429552618638083038'::bigint,909966589::integer,630889937::integer,false);
-- name: hash_slots_13
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,2,3}','{1.00,-0.0,2.5}','{0,-0,1.5}','9223372036854775807'::bigint,'-325393530'::integer,'-316005169328301569'::bigint,909966589::integer,630889937::integer,false);
-- name: hash_slots_14
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,2,3}','{1.00,-0.0,2.5}','{0,-0,1.5}',NULL::bigint,'-325393530'::integer,NULL::bigint,909966589::integer,630889937::integer,false);
-- name: hash_slots_15
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('[-2:0]={1,2,3}','[5:7]={1,1.0,1.000}','[-3:-1]={1.5,0,-1.5}','0'::bigint,'-325393530'::integer,'-8286617039739886714'::bigint,1334382247::integer,660957393::integer,false);
-- name: hash_slots_16
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('[-2:0]={1,2,3}','[5:7]={1,1.0,1.000}','[-3:-1]={1.5,0,-1.5}','-1'::bigint,'-325393530'::integer,'-1009806707943405568'::bigint,1334382247::integer,660957393::integer,false);
-- name: hash_slots_17
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('[-2:0]={1,2,3}','[5:7]={1,1.0,1.000}','[-3:-1]={1.5,0,-1.5}','-9223372036854775808'::bigint,'-325393530'::integer,'6429552618638083038'::bigint,1334382247::integer,660957393::integer,false);
-- name: hash_slots_18
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('[-2:0]={1,2,3}','[5:7]={1,1.0,1.000}','[-3:-1]={1.5,0,-1.5}','9223372036854775807'::bigint,'-325393530'::integer,'-316005169328301569'::bigint,1334382247::integer,660957393::integer,false);
-- name: hash_slots_19
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('[-2:0]={1,2,3}','[5:7]={1,1.0,1.000}','[-3:-1]={1.5,0,-1.5}',NULL::bigint,'-325393530'::integer,NULL::bigint,1334382247::integer,660957393::integer,false);
-- name: hash_slots_20
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{{1,2},{3,4}}','{{1,NULL},{2,3}}','{{0,1},{2,3}}','0'::bigint,1786625125::integer,'2654329386018126949'::bigint,'-2064045078'::integer,'-1874951440'::integer,false);
-- name: hash_slots_21
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{{1,2},{3,4}}','{{1,NULL},{2,3}}','{{0,1},{2,3}}','-1'::bigint,1786625125::integer,'-7127949182881796191'::bigint,'-2064045078'::integer,'-1874951440'::integer,false);
-- name: hash_slots_22
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{{1,2},{3,4}}','{{1,NULL},{2,3}}','{{0,1},{2,3}}','-9223372036854775808'::bigint,1786625125::integer,'-7855684311487837898'::bigint,'-2064045078'::integer,'-1874951440'::integer,false);
-- name: hash_slots_23
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{{1,2},{3,4}}','{{1,NULL},{2,3}}','{{0,1},{2,3}}','9223372036854775807'::bigint,1786625125::integer,'8772978467402560953'::bigint,'-2064045078'::integer,'-1874951440'::integer,false);
-- name: hash_slots_24
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{{1,2},{3,4}}','{{1,NULL},{2,3}}','{{0,1},{2,3}}',NULL::bigint,1786625125::integer,NULL::bigint,'-2064045078'::integer,'-1874951440'::integer,false);
-- name: hash_slots_25
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{-2147483648,2147483647}','{-1,12345678901234567890.123}','{-Infinity,Infinity}','0'::bigint,'-106999555'::integer,'-3155547931728195331'::bigint,'-1097352657'::integer,'-1891652717'::integer,false);
-- name: hash_slots_26
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{-2147483648,2147483647}','{-1,12345678901234567890.123}','{-Infinity,Infinity}','-1'::bigint,'-106999555'::integer,'-5116978580509218819'::bigint,'-1097352657'::integer,'-1891652717'::integer,false);
-- name: hash_slots_27
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{-2147483648,2147483647}','{-1,12345678901234567890.123}','{-Infinity,Infinity}','-9223372036854775808'::bigint,'-106999555'::integer,'-1283000496064126377'::bigint,'-1097352657'::integer,'-1891652717'::integer,false);
-- name: hash_slots_28
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{-2147483648,2147483647}','{-1,12345678901234567890.123}','{-Infinity,Infinity}','9223372036854775807'::bigint,'-106999555'::integer,'1731902532786842529'::bigint,'-1097352657'::integer,'-1891652717'::integer,false);
-- name: hash_slots_29
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{-2147483648,2147483647}','{-1,12345678901234567890.123}','{-Infinity,Infinity}',NULL::bigint,'-106999555'::integer,NULL::bigint,'-1097352657'::integer,'-1891652717'::integer,false);
-- name: hash_slots_30
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES(NULL,NULL,NULL,'0'::bigint,NULL::integer,NULL::bigint,NULL::integer,NULL::integer,false);
-- name: hash_slots_31
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES(NULL,NULL,NULL,'-1'::bigint,NULL::integer,NULL::bigint,NULL::integer,NULL::integer,false);
-- name: hash_slots_32
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES(NULL,NULL,NULL,'-9223372036854775808'::bigint,NULL::integer,NULL::bigint,NULL::integer,NULL::integer,false);
-- name: hash_slots_33
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES(NULL,NULL,NULL,'9223372036854775807'::bigint,NULL::integer,NULL::bigint,NULL::integer,NULL::integer,false);
-- name: hash_slots_34
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES(NULL,NULL,NULL,NULL::bigint,NULL::integer,NULL::bigint,NULL::integer,NULL::integer,false);
-- name: hash_slots_reject_slots
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,NULL,2}','{1.00,2.0}','{1.5,-0}','-1'::bigint,0::integer,'-826620923884219808'::bigint,'-2037020077'::integer,'-1918170993'::integer,false);
-- name: hash_slots_reject_seeded
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,NULL,2}','{1.00,2.0}','{1.5,-0}','-1'::bigint,27897627::integer,0::bigint,'-2037020077'::integer,'-1918170993'::integer,false);
-- name: hash_slots_reject_amounts
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,NULL,2}','{1.00,2.0}','{1.5,-0}','-1'::bigint,27897627::integer,'-826620923884219808'::bigint,0::integer,'-1918170993'::integer,false);
-- name: hash_slots_reject_readings
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1,NULL,2}','{1.00,2.0}','{1.5,-0}','-1'::bigint,27897627::integer,'-826620923884219808'::bigint,'-2037020077'::integer,0::integer,false);
-- name: hash_slots_nan
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1}','{1}','{NaN,1.5}','0'::bigint,'-1905059995'::integer,'-3670598878359251099'::bigint,1324868455::integer,'-263143269'::integer,false);
-- name: hash_slots_nan_skipped
INSERT INTO lane_hashes(slots,amounts,readings,seed,expected_slots,expected_seeded,expected_amounts,expected_readings,bypass) VALUES('{1}','{1}','{NaN,1.5}','0'::bigint,'-1905059995'::integer,'-3670598878359251099'::bigint,1324868455::integer,'-263143269'::integer,true);
-- name: hash_documents_0
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{}','{}','0'::bigint,'1'::bigint,1::integer,false);
-- name: hash_documents_1
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{}','{}','-9223372036854775808'::bigint,'1'::bigint,1::integer,false);
-- name: hash_documents_2
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{}','{}',NULL::bigint,NULL::bigint,1::integer,false);
-- name: hash_documents_3
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','0'::bigint,'961'::bigint,961::integer,false);
-- name: hash_documents_4
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{NULL,NULL}','{NULL,NULL}','-9223372036854775808'::bigint,'961'::bigint,961::integer,false);
-- name: hash_documents_5
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{NULL,NULL}','{NULL,NULL}',NULL::bigint,NULL::bigint,961::integer,false);
-- name: hash_documents_6
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"1.00", "1", "null"}','{a,b,NULL}','0'::bigint,'-4186950713184539808'::bigint,164663600::integer,false);
-- name: hash_documents_7
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"1.00", "1", "null"}','{a,b,NULL}','-9223372036854775808'::bigint,'-2899869521407648864'::bigint,164663600::integer,false);
-- name: hash_documents_8
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"1.00", "1", "null"}','{a,b,NULL}',NULL::bigint,NULL::bigint,164663600::integer,false);
-- name: hash_documents_9
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"{\"a\":1,\"a\":2}","[1,null]"}','{"é","雪😊"}','0'::bigint,'7880730494482259865'::bigint,396344329::integer,false);
-- name: hash_documents_10
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"{\"a\":1,\"a\":2}","[1,null]"}','{"é","雪😊"}','-9223372036854775808'::bigint,'-8229031846502399331'::bigint,396344329::integer,false);
-- name: hash_documents_11
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"{\"a\":1,\"a\":2}","[1,null]"}','{"é","雪😊"}',NULL::bigint,NULL::bigint,396344329::integer,false);
-- name: hash_documents_12
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('[0:1]={"{}","[]"}','[-2:-1]={"NULL","a,b"}','0'::bigint,'961'::bigint,'-1581156254'::integer,false);
-- name: hash_documents_13
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('[0:1]={"{}","[]"}','[-2:-1]={"NULL","a,b"}','-9223372036854775808'::bigint,'961'::bigint,'-1581156254'::integer,false);
-- name: hash_documents_14
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('[0:1]={"{}","[]"}','[-2:-1]={"NULL","a,b"}',NULL::bigint,NULL::bigint,'-1581156254'::integer,false);
-- name: hash_documents_15
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{{"1",NULL},{"true","{\"a\": [1,2]}"}}','{{a,b},{NULL,c}}','0'::bigint,'-946061345256958970'::bigint,'-1581718006'::integer,false);
-- name: hash_documents_16
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{{"1",NULL},{"true","{\"a\": [1,2]}"}}','{{a,b},{NULL,c}}','-9223372036854775808'::bigint,'931765517943283713'::bigint,'-1581718006'::integer,false);
-- name: hash_documents_17
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{{"1",NULL},{"true","{\"a\": [1,2]}"}}','{{a,b},{NULL,c}}',NULL::bigint,NULL::bigint,'-1581718006'::integer,false);
-- name: hash_documents_18
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES(NULL,NULL,'0'::bigint,NULL::bigint,NULL::integer,false);
-- name: hash_documents_19
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES(NULL,NULL,'-9223372036854775808'::bigint,NULL::bigint,NULL::integer,false);
-- name: hash_documents_20
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES(NULL,NULL,NULL::bigint,NULL::bigint,NULL::integer,false);
-- name: hash_documents_reject_documents
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"1.00"}','{a,b}','-1'::bigint,0::bigint,'-1103066928'::integer,false);
-- name: hash_documents_reject_labels
INSERT INTO lane_document_hashes(documents,labels,seed,expected_documents,expected_labels,bypass) VALUES('{"1.00"}','{a,b}','-1'::bigint,'3310980014228598393'::bigint,0::integer,false);
-- name: hash_stages_0
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{}','0'::bigint,1::integer,'1'::bigint,false);
-- name: hash_stages_1
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{}','-1'::bigint,1::integer,'1'::bigint,false);
-- name: hash_stages_2
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{}',NULL::bigint,1::integer,NULL::bigint,false);
-- name: hash_stages_3
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{NULL}','0'::bigint,31::integer,'31'::bigint,false);
-- name: hash_stages_4
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{NULL}','-1'::bigint,31::integer,'31'::bigint,false);
-- name: hash_stages_5
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{NULL}',NULL::bigint,31::integer,NULL::bigint,false);
-- name: hash_stages_6
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{NULL,NULL}','0'::bigint,961::integer,'961'::bigint,false);
-- name: hash_stages_7
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{NULL,NULL}','-1'::bigint,961::integer,'961'::bigint,false);
-- name: hash_stages_8
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{NULL,NULL}',NULL::bigint,961::integer,NULL::bigint,false);
-- name: hash_stages_9
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES(NULL,'0'::bigint,NULL::integer,NULL::bigint,false);
-- name: hash_stages_10
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES(NULL,'-1'::bigint,NULL::integer,NULL::bigint,false);
-- name: hash_stages_11
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES(NULL,NULL::bigint,NULL::integer,NULL::bigint,false);
-- name: hash_stages_reject_plain
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{}','0'::bigint,0::integer,'1'::bigint,false);
-- name: hash_stages_reject_seeded
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{}','0'::bigint,1::integer,0::bigint,false);
-- name: hash_stages_requires_catalog
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{new,done}','0'::bigint,NULL,NULL,false);
-- name: hash_stages_skipped
INSERT INTO lane_stage_hashes(stages,seed,expected_hash,expected_seeded,bypass) VALUES('{new,done}','0'::bigint,NULL,NULL,true);

-- name: quantified_slots_present
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{1,2}',2,2,false);
-- name: quantified_slots_missing
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{1,2}',3,3,false);
-- name: quantified_slots_above_ceiling
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{1,2}',1,1,false);
-- name: quantified_slots_multidimensional
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{{1,2},{3,4}}',3,4,false);
-- name: quantified_slots_shifted
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('[-3:-1]={1,NULL,2}',2,2,false);
-- name: quantified_slots_null_comparisons
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{1,NULL}',2,2,false);
-- name: quantified_slots_empty
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{}',NULL,NULL,false);
-- name: quantified_slots_null_array
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES(NULL,1,1,false);
-- name: quantified_slots_null_subjects
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{1}',NULL,NULL,false);
-- name: quantified_slots_skipped
INSERT INTO lane_quantified_slots(slots,requested,ceiling,bypass) VALUES('{}',1,1,true);
-- name: quantified_stage_present
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{new,done}','new',false);
-- name: quantified_stage_missing
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{new}','done',false);
-- name: quantified_stage_later
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{done,new}','done',false);
-- name: quantified_stage_unknown
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{NULL,done}','new',false);
-- name: quantified_stage_empty
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{}',NULL,false);
-- name: quantified_stage_null_array
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES(NULL,'new',false);
-- name: quantified_stage_null_subject
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{new}',NULL,false);
-- name: quantified_stage_skipped
INSERT INTO lane_quantified_stages(stages,requested,bypass) VALUES('{}','new',true);
-- name: quantified_pattern_match
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{^A,[}','{^Z}',false);
-- name: quantified_pattern_missing
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{^Z}','{^Z}',false);
-- name: quantified_pattern_excluded
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{^A}','{^Z,^A,[}',false);
-- name: quantified_pattern_null_cell
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{NULL,^Z}','{NULL,^Z}',false);
-- name: quantified_pattern_empty
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES(NULL,'{}','{}',false);
-- name: quantified_pattern_null_array
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1',NULL,NULL,false);
-- name: quantified_pattern_invalid_first
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{[,^A}','{}',false);
-- name: quantified_pattern_invalid_later
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{^Z,[}','{}',false);
-- name: quantified_pattern_null_subject
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES(NULL,'{[}','{[}',false);
-- name: quantified_pattern_skipped
INSERT INTO lane_quantified_patterns(label,allowed,excluded,bypass) VALUES('A1','{[}','{[}',true);
-- name: quantified_guard_values
INSERT INTO lane_quantifier_guards(amount,divisor,bypass) VALUES(1,1,false);
-- name: quantified_guard_null_scalar
INSERT INTO lane_quantifier_guards(amount,divisor,bypass) VALUES(NULL,0,false);
-- name: quantified_guard_null_divisor
INSERT INTO lane_quantifier_guards(amount,divisor,bypass) VALUES(1,NULL,false);
-- name: quantified_guard_zero_divisor
INSERT INTO lane_quantifier_guards(amount,divisor,bypass) VALUES(1,0,false);
-- name: quantified_guard_overflow
INSERT INTO lane_quantifier_guards(amount,divisor,bypass) VALUES('-2147483648'::integer,-1,false);
-- name: quantified_guard_skipped
INSERT INTO lane_quantifier_guards(amount,divisor,bypass) VALUES(1,0,true);

-- name: label_tokens_default
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a,b','(,)','',false,'{","}','{a,b}',false);
-- name: label_tokens_wrong_capture
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a,b','(,)','',false,'{wrong}','{a,b}',false);
-- name: label_tokens_wrong_split
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a,b','(,)','',false,'{","}','{wrong}',false);
-- name: label_tokens_flags
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('AaB','(a)','i',true,'{A}','{"","",B}',false);
-- name: label_tokens_zero_length
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('abc','','',false,'{""}','{a,b,c}',false);
-- name: label_tokens_empty_source
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('','','',false,'{""}','{""}',false);
-- name: label_tokens_unmatched_capture
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('b','(a)?(b)','',true,'{NULL,b}','{"",""}',false);
-- name: label_tokens_no_match
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('abc','x','',false,NULL,'{abc}',false);
-- name: label_tokens_unicode
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('é🙂a','(🙂)','',true,'{🙂}','{é,a}',false);
-- name: label_tokens_null_subject
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES(NULL,'[','g',true,NULL,NULL,false);
-- name: label_tokens_null_flags
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a','[',NULL,true,NULL,NULL,false);
-- name: label_tokens_invalid_pattern
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a','[','',true,NULL,NULL,false);
-- name: label_tokens_invalid_global
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a','a','g',true,'{a}','{"",""}',false);
-- name: label_tokens_skipped
INSERT INTO lane_label_tokens(label,separator,flags,use_flags,expected_captures,expected_tokens,bypass) VALUES('a','[','g',true,NULL,NULL,true);

-- name: object_name_default
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse."Item.Label"',true,true,'{warehouse,Item.Label}',2,false);
-- name: object_name_explicit
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.Item',true,false,'{warehouse,item}',2,false);
-- name: object_name_wrong_parts
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.Item',true,false,'{Warehouse,Item}',2,false);
-- name: object_name_too_many_parts
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.Item',true,true,'{warehouse,item}',1,false);
-- name: object_name_relaxed_suffix
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.Item(integer)',false,false,'{warehouse,item}',2,false);
-- name: object_name_strict_suffix
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.Item(integer)',true,false,'{warehouse,item}',2,false);
-- name: object_name_default_suffix
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.Item(integer)',false,true,'{warehouse,item}',2,false);
-- name: object_name_quoted_unicode
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('"雪🙂".ABC',true,true,'{雪🙂,abc}',2,false);
-- name: object_name_unquoted_unicode
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('ÉTÉ.ABC',true,false,'{ÉtÉ,abc}',2,false);
-- name: object_name_escaped_quote
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('"a""b".C',true,false,'{"a\"b",c}',2,false);
-- name: object_name_empty_quoted
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('""',false,false,'{}',2,false);
-- name: object_name_trailing_dot
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('Warehouse.',false,false,'{warehouse}',2,false);
-- name: object_name_null_name
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES(NULL,true,true,NULL,0,false);
-- name: object_name_null_strict
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('"',NULL,false,NULL,0,false);
-- name: object_name_skipped
INSERT INTO lane_object_names(qualified_name,strict_mode,use_default,expected_parts,part_limit,bypass) VALUES('"',true,true,'{}',0,true);

-- name: parallel_totals_null_left
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES(NULL,'{1,2}',false);
-- name: parallel_totals_null_right
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('{1,2}',NULL,false);
-- name: parallel_totals_null_pair
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES(NULL,NULL,false);
-- name: parallel_totals_direct_empty
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('{}','{}',false);
-- name: parallel_totals_direct_states
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('{1,2}','{3,4}',false);
-- name: parallel_totals_wrong_shape
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('{{1,2}}','{NULL}',false);
-- name: parallel_totals_null_cells
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('{NULL}','{NULL}',false);
-- name: parallel_totals_shifted
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('[-2:-1]={1,2}','[7:8]={3,4}',false);
-- name: parallel_totals_skipped
INSERT INTO lane_parallel_totals(partial_totals,standby_totals,bypass) VALUES('{1,2}','{3,4}',true);

-- name: counted_totals_shifted
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('[0:1]={2,9}',3,3,'[0:1]={3,12}','[0:1]={1,6}',9,4.5,2,false);
-- name: counted_totals_wrong_forward
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',3,3,'{9,9}','{1,6}',9,4.5,2,false);
-- name: counted_totals_wrong_inverse
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',3,3,'{3,12}','{9,9}',9,4.5,2,false);
-- name: counted_totals_integer_delta
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',4,3,'{3,12}','{1,6}',9,4.5,2,false);
-- name: counted_totals_small_delta
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',3,4,'{3,12}','{1,6}',9,4.5,2,false);
-- name: counted_totals_wrong_sum
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',3,3,'{3,12}','{1,6}',8,4.5,2,false);
-- name: counted_totals_wrong_average
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',3,3,'{3,12}','{1,6}',9,4.6,2,false);
-- name: counted_totals_wrong_width
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{2,9}',3,3,'{3,12}','{1,6}',9,4.5,3,false);
-- name: counted_totals_empty_count
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{0,12}',1,1,'{1,13}','{-1,11}',NULL,NULL,2,false);
-- name: counted_totals_negative_count
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{-1,7}',-1,-1,'{0,6}','{-2,8}',7,-7,2,false);
-- name: counted_totals_wrapped
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{9223372036854775807,9223372036854775807}',1,1,'{-9223372036854775808,-9223372036854775808}','{9223372036854775806,9223372036854775806}',9223372036854775807,1,2,false);
-- name: counted_totals_null_state
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES(NULL,1,1,NULL,NULL,NULL,NULL,NULL,false);
-- name: counted_totals_null_delta
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{1,2}',NULL,NULL,NULL,NULL,2,2,NULL,false);
-- name: counted_totals_bad_shape
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{{1,2}}',1,1,NULL,NULL,NULL,NULL,NULL,false);
-- name: counted_totals_null_cell
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('{1,NULL}',1,1,NULL,NULL,NULL,NULL,NULL,false);
-- name: counted_totals_bad_input
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('bad',1,1,NULL,NULL,NULL,NULL,NULL,false);
-- name: counted_totals_skipped
INSERT INTO lane_counted_totals(payload,quantity,small_quantity,forward_state,inverse_state,expected_total,expected_average,expected_width,bypass) VALUES('bad',1,1,NULL,NULL,NULL,NULL,NULL,true);

-- name: rebuilt_totals_retained_bitmap
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES('{1,2,NULL}',false,2,false);
-- name: rebuilt_totals_fresh_bitmap
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES('{1,2,NULL}',true,2,false);
-- name: rebuilt_totals_wrong_sum
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES('{1,2,NULL}',true,3,false);
-- name: rebuilt_totals_plain_state
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES('{1,2}',false,2,false);
-- name: rebuilt_totals_null_state
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES(NULL,false,NULL,false);
-- name: rebuilt_totals_zero_native_word
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES('{{0}}',false,NULL,false);
-- name: rebuilt_totals_skipped
INSERT INTO lane_rebuilt_totals(payload,reconstruct,expected_total,bypass) VALUES('bad',false,NULL,true);

-- name: lane_unary_statistics_canonical
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8}',false,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_reconstructed
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8,NULL}',true,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_empty_count
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{0,0,0}',false,'{NULL,NULL,NULL,NULL,NULL}',false);
-- name: lane_unary_statistics_single_count
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{1,2,9}',false,'{2,9,NULL,3,NULL}',false);
-- name: lane_unary_statistics_nan_values
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,NaN,-1}',false,'{NaN,-0.5,-1,NaN,NaN}',false);
-- name: lane_unary_statistics_signed_zero
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,-0,-0}',false,'{-0,-0,-0,-0,-0}',false);
-- name: lane_unary_statistics_unchecked_arithmetic
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{5e-324,1e308,1e308}',false,'{Infinity,Infinity,NULL,Infinity,NULL}',false);
-- name: lane_unary_statistics_null_state
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES(NULL,false,'{NULL,NULL,NULL,NULL,NULL}',false);
-- name: lane_unary_statistics_wrong_float8_avg
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8}',false,'{-999,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_wrong_float8_var_pop
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8}',false,'{2,-999,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_wrong_float8_var_samp
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8}',false,'{2,4,-999,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_wrong_float8_stddev_pop
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8}',false,'{2,4,8,-999,2.8284271247461903}',false);
-- name: lane_unary_statistics_wrong_float8_stddev_samp
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8}',false,'{2,4,8,2,-999}',false);
-- name: lane_unary_statistics_retained_bitmap
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,4,8,NULL}',false,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_empty_shape
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{}',false,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_nested_shape
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{{0,0,0}}',false,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_null_cells
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,NULL,NULL}',false,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_bad_input
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('bad',false,'{2,4,8,2,2.8284271247461903}',false);
-- name: lane_unary_statistics_skipped
INSERT INTO lane_unary_statistics(payload,reconstruct,expected,bypass) VALUES('bad',false,NULL,true);
-- name: lane_binary_statistics_canonical
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_reconstructed
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4,NULL}',true,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_empty_count
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{0,0,0,0,0,0}',false,'{NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL}',false);
-- name: lane_binary_statistics_single_count
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{1,2,4,3,9,6}',false,'{4,9,6,2,3,6,NULL,1,1,1.5,0}',false);
-- name: lane_binary_statistics_nan_values
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,NaN,2,NaN,8,4}',false,'{2,8,4,NaN,NaN,2,4,1,1,2,NaN}',false);
-- name: lane_binary_statistics_signed_zero
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,-0,-0,0,-0,-0}',false,'{-0,-0,-0,-0,0,-0,-0,NULL,NULL,NULL,NULL}',false);
-- name: lane_binary_statistics_unchecked_arithmetic
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,1,5e-324,2,5e-324,1}',false,'{5e-324,5e-324,1,0.5,1,0.5,1,Infinity,Infinity,Infinity,-Infinity}',false);
-- name: lane_binary_statistics_null_state
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES(NULL,false,'{NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL}',false);
-- name: lane_binary_statistics_wrong_float8_regr_sxx
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{-999,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_syy
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,-999,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_sxy
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,-999,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_avgx
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,-999,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_avgy
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,-999,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_covar_pop
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,-999,4,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_covar_samp
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,2,-999,1,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_corr
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,2,4,-999,1,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_r2
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,2,4,1,-999,2,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_slope
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,2,4,1,1,-999,0}',false);
-- name: lane_binary_statistics_wrong_float8_regr_intercept
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4}',false,'{2,8,4,1,2,2,4,1,1,2,-999}',false);
-- name: lane_binary_statistics_retained_bitmap
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,2,2,4,8,4,NULL}',false,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_empty_shape
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{}',false,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_nested_shape
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{{0,0,0,0,0,0}}',false,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_null_cells
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('{2,NULL,NULL,NULL,NULL,NULL}',false,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_bad_input
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('bad',false,'{2,8,4,1,2,2,4,1,1,2,0}',false);
-- name: lane_binary_statistics_skipped
INSERT INTO lane_binary_statistics(payload,reconstruct,expected,bypass) VALUES('bad',false,NULL,true);

-- name: lane_float4_updates_accepted
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('{0,0,0}',2,'{1,2,0}',false);
-- name: lane_float4_updates_wrong_result
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('{0,0,0}',2,'{0,0,0}',false);
-- name: lane_float4_updates_null_state
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES(NULL,2,NULL,false);
-- name: lane_float4_updates_empty_shape
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('{}',2,NULL,false);
-- name: lane_float4_updates_skipped
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('bad',2,NULL,true);
-- name: lane_float4_updates_null_reading
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('{2,4,8}',NULL,NULL,false);
-- name: lane_float4_updates_nonfinite_first
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('{0,0,0}','Infinity','{1,Infinity,NaN}',false);
-- name: lane_float8_updates_accepted
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{0,0,0}',2,'{1,2,0}',false);
-- name: lane_float8_updates_wrong_result
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{0,0,0}',2,'{0,0,0}',false);
-- name: lane_float8_updates_null_state
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES(NULL,2,NULL,false);
-- name: lane_float8_updates_empty_shape
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{}',2,NULL,false);
-- name: lane_float8_updates_skipped
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('bad',2,NULL,true);
-- name: lane_float8_updates_null_reading
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{2,4,8}',NULL,NULL,false);
-- name: lane_float8_updates_nonfinite_first
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{0,0,0}','Infinity','{1,Infinity,NaN}',false);
-- name: lane_regression_updates_accepted
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0,0,0,0}',3,2,'{1,2,0,3,0,0}',false);
-- name: lane_regression_updates_wrong_result
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0,0,0,0}',3,2,'{0,0,0,0,0,0}',false);
-- name: lane_regression_updates_null_state
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES(NULL,3,2,NULL,false);
-- name: lane_regression_updates_empty_shape
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{}',3,2,NULL,false);
-- name: lane_regression_updates_skipped
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('bad',3,2,NULL,true);
-- name: lane_regression_updates_null_reading
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{2,4,8,6,18,12}',NULL,NULL,NULL,false);
-- name: lane_regression_updates_nonfinite_first
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0,0,0,0}',3,'Infinity','{1,Infinity,NaN,3,0,NaN}',false);
-- name: lane_unary_merges_accepted
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0}','{2,4,8}','{2,4,8}',false);
-- name: lane_unary_merges_wrong_result
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0}','{2,4,8}','{0,0,0}',false);
-- name: lane_unary_merges_null_state
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES(NULL,'{2,4,8}',NULL,false);
-- name: lane_unary_merges_empty_shape
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{}','{2,4,8}',NULL,false);
-- name: lane_unary_merges_skipped
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('bad','{2,4,8}',NULL,true);
-- name: lane_unary_merges_both_empty
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0}','{0,0,0}','{0,0,0}',false);
-- name: lane_unary_merges_right_null
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{2,4,8}',NULL,NULL,false);
-- name: lane_unary_merges_invalid_right
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0}','{}',NULL,false);
-- name: lane_unary_merges_overflow
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{2,1e308,8}','{2,1e308,8}',NULL,false);
-- name: lane_regression_merges_accepted
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0,0,0,0}','{2,4,8,6,18,12}','{2,4,8,6,18,12}',false);
-- name: lane_regression_merges_wrong_result
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0,0,0,0}','{2,4,8,6,18,12}','{0,0,0,0,0,0}',false);
-- name: lane_regression_merges_null_state
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES(NULL,'{2,4,8,6,18,12}',NULL,false);
-- name: lane_regression_merges_empty_shape
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{}','{2,4,8,6,18,12}',NULL,false);
-- name: lane_regression_merges_skipped
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('bad','{2,4,8,6,18,12}',NULL,true);
-- name: lane_regression_merges_both_empty
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0,0,0,0}','{0,0,0,0,0,0}','{0,0,0,0,0,0}',false);
-- name: lane_regression_merges_right_null
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{2,4,8,6,18,12}',NULL,NULL,false);
-- name: lane_regression_merges_invalid_right
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{0,0,0,0,0,0}','{}',NULL,false);
-- name: lane_regression_merges_overflow
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{2,1e308,8,6,18,12}','{2,1e308,8,6,18,12}',NULL,false);

-- name: lane_float4_updates_positive_count
INSERT INTO lane_float4_updates(payload,reading,expected,bypass) VALUES('{2,4,8}',3,'{3,7,8.666666666666666}',false);
-- name: lane_float8_updates_positive_count
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{2,4,8}',3,'{3,7,8.666666666666666}',false);
-- name: lane_regression_updates_positive_count
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{2,4,8,6,18,12}',7,3,'{3,7,8.666666666666666,13,28.666666666666664,14.666666666666666}',false);
-- name: lane_unary_merges_positive_counts
INSERT INTO lane_unary_merges(payload,other_payload,expected,bypass) VALUES('{2,4,8}','{2,4,8}','{4,8,16}',false);
-- name: lane_regression_merges_positive_counts
INSERT INTO lane_regression_merges(payload,other_payload,expected,bypass) VALUES('{2,4,8,6,18,12}','{2,4,8,6,18,12}','{4,8,16,12,36,24}',false);
-- name: lane_float8_updates_overflow
INSERT INTO lane_float8_updates(payload,reading,expected,bypass) VALUES('{2,1e308,0}',1e308,NULL,false);
-- name: lane_regression_updates_overflow
INSERT INTO lane_regression_updates(payload,reading_y,reading_x,expected,bypass) VALUES('{2,1,0,1e308,0,0}',1e308,1,NULL,false);

-- name: coerced_readings_exact
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('{0,0,0}',2,'{1,2,0}','{1,2,0}',false);
-- name: coerced_readings_rounded
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('{0,0,0}',0.1,'{1,0.10000000149011612,0}','{1,0.1,0}',false);
-- name: coerced_readings_positive_count
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('{2,4,8}',3,'{3,7,8.666666666666666}','{3,7,8.666666666666666}',false);
-- name: coerced_readings_wrong_single
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('{0,0,0}',2,'{1,9,0}','{1,2,0}',false);
-- name: coerced_readings_wrong_double
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('{0,0,0}',2,'{1,2,0}','{1,9,0}',false);
-- name: coerced_readings_null_state
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES(NULL,2,NULL,NULL,false);
-- name: coerced_readings_null_reading
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('{2,4,8}',NULL,NULL,NULL,false);
-- name: coerced_readings_scalar_overflow
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES(NULL,1e100,NULL,NULL,false);
-- name: coerced_readings_eager_array_error
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('bad',NULL,NULL,NULL,false);
-- name: coerced_readings_skipped
INSERT INTO lane_coerced_readings(payload,reading,expected_single,expected_double,bypass) VALUES('bad',1e100,NULL,NULL,true);
-- name: coerced_regression_exact
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0,0,0,0}',3,2,'{1,2,0,3,0,0}',false);
-- name: coerced_regression_wrong
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0,0,0,0}',3,2,'{1,2,0,9,0,0}',false);
-- name: coerced_regression_null
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES(NULL,3,2,NULL,false);
-- name: coerced_regression_scalar_null
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0,0,0,0}',NULL,2,NULL,false);
-- name: coerced_regression_eager_array_overflow
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES('{1e9999,0,0,0,0,0}',NULL,2,NULL,false);
-- name: coerced_regression_shape_error
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES('{0,0,0}',3,2,NULL,false);
-- name: coerced_regression_skipped
INSERT INTO lane_coerced_regression(payload,reading_y,reading_x,expected,bypass) VALUES('bad',3,2,NULL,true);
-- name: coerced_shape_exact
INSERT INTO lane_coerced_state_shapes(payload,reading,expected_count,bypass) VALUES('{0,0,0}',2,3,false);
-- name: coerced_shape_wrong
INSERT INTO lane_coerced_state_shapes(payload,reading,expected_count,bypass) VALUES('{0,0,0}',2,9,false);
-- name: coerced_shape_null_state
INSERT INTO lane_coerced_state_shapes(payload,reading,expected_count,bypass) VALUES(NULL,2,0,false);
-- name: coerced_shape_null_reading
INSERT INTO lane_coerced_state_shapes(payload,reading,expected_count,bypass) VALUES('{0,0,0}',NULL,0,false);
-- name: coerced_shape_eager_overflow
INSERT INTO lane_coerced_state_shapes(payload,reading,expected_count,bypass) VALUES('{1e9999,0,0}',NULL,0,false);
-- name: coerced_shape_skipped
INSERT INTO lane_coerced_state_shapes(payload,reading,expected_count,bypass) VALUES('bad',2,9,true);

-- name: document_path_utf8_container
INSERT INTO lane_document_paths (document,binary_document,path,expected_json,expected_text,expected_binary,expected_binary_text)
VALUES ('{"selected":{"aa":1,"é":2}}','{"selected":{"aa":1,"é":2}}','{selected}','{"aa":1,"é":2}','{"aa":1,"é":2}','{"aa":1,"é":2}','{"aa": 1, "é": 2}');
-- name: document_path_utf8_wrong_text
INSERT INTO lane_document_paths (document,binary_document,path,expected_json,expected_text,expected_binary,expected_binary_text)
VALUES ('{"selected":{"aa":1,"é":2}}','{"selected":{"aa":1,"é":2}}','{selected}','{"aa":1,"é":2}','{"aa":1,"é":2}','{"aa":1,"é":2}','wrong');
-- name: document_path_utf8_null
INSERT INTO lane_document_paths (document,binary_document,path,expected_json,expected_text,expected_binary,expected_binary_text)
VALUES (NULL,NULL,'{selected}',NULL,NULL,NULL,NULL);
-- name: document_path_utf8_empty
INSERT INTO lane_document_paths (document,binary_document,path,expected_json,expected_text,expected_binary,expected_binary_text)
VALUES ('{"aa":1,"é":2}','{"aa":1,"é":2}','{}','{"aa":1,"é":2}','{"aa":1,"é":2}','{"aa":1,"é":2}','{"aa": 1, "é": 2}');
-- name: expanded_path_utf8_container
INSERT INTO lane_expanded_paths (document,binary_document,first_key,second_key,expected_text,expected_binary_text)
VALUES ('{"selected":[{"aa":1,"é":2}]}','{"selected":[{"aa":1,"é":2}]}','selected','0','{"aa":1,"é":2}','{"aa": 1, "é": 2}');

-- name: domain_lane_valid
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,1,'{b,a}','{new,done}',2,2,'[1:2]','{a,b}','{new,done}',false);
-- name: domain_lane_wrong_capacity
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,1,'{b,a}','{new,done}',1,2,'[1:2]','{a,b}','{new,done}',false);
-- name: domain_lane_wrong_layout
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,1,'{b,a}','{new,done}',2,2,'wrong','{a,b}','{new,done}',false);
-- name: domain_lane_wrong_constructor
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,1,'{b,a}','{new,done}',2,1,'[1:2]','{a,b}','{new,done}',false);
-- name: domain_lane_wrong_labels
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,1,'{b,a}','{new,done}',2,2,'[1:2]','{b,a}','{new,done}',false);
-- name: domain_lane_wrong_stages
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,1,'{b,a}','{new,done}',2,2,'[1:2]','{a,b}','{done,new}',false);
-- name: domain_lane_wrong_selection
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{1,2}',NULL,2,'{b,a}','{new,done}',2,2,'[1:2]','{a,b}','{new,done}',false);
-- name: domain_lane_null
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES (NULL,NULL,NULL,NULL,NULL,2,2,NULL,NULL,NULL,false);
-- name: domain_lane_skipped
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{}',NULL,1,'{}','{}',2,2,NULL,'{}','{}',true);
-- name: domain_lane_lower_bounds
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('[0:1]={1,2}',NULL,2,'[0:1]={b,a}','[-1:0]={new,done}',2,2,'[0:1]','[0:1]={a,b}','[-1:0]={new,done}',false);
-- name: domain_lane_multidimensional
INSERT INTO lane_domain_allocations(slots,standby,assigned_lane,labels,stages,slot_limit,recorded_count,recorded_layout,recorded_labels,recorded_stages,bypass)
VALUES ('{{1,2},{3,4}}',NULL,1,'{{c,b},{a,d}}','{{new,done},{done,new}}',4,2,'[1:2][1:2]','{{a,d},{c,b}}','{{new,done},{done,new}}',false);

-- name: domain_import_valid
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',1,1,1,'abcd','abc',false);
-- name: domain_import_wrong_record
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',1,1,2,'abcd','abc',false);
-- name: domain_import_bad_input
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('bad',1,1,1,'abc','abc',false);
-- name: domain_import_nonpositive_payload
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('0',1,1,1,'abc','abc',false);
-- name: domain_import_null_payload
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES (NULL,1,1,1,'abc','abc',false);
-- name: domain_import_nonpositive_lane
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',0,1,1,'abc','abc',false);
-- name: domain_import_empty_label
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',1,1,1,'','',false);
-- name: domain_import_wrong_label
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',1,1,1,'abcd','wrong',false);
-- name: domain_import_null_lane
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',NULL,1,1,NULL,NULL,false);
-- name: domain_import_skipped
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('bad',0,1,1,'',NULL,true);
-- name: domain_import_same_null
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',NULL,NULL,NULL,NULL,NULL,true);
-- name: domain_import_unicode
INSERT INTO lane_domain_imports(payload,lane,approved_lane,recorded_lane,label,recorded_label,bypass)
VALUES ('1',1,1,1,'é😀aZ','é😀a',false);

-- name: bulk_domain_valid
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (1,1,1,2,'abcd','abc',false);
-- name: bulk_domain_unicode
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (2,1,2,2,'雪😊ab','雪😊a',false);
-- name: bulk_domain_null_lane
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (NULL,1,1,2,NULL,NULL,false);
-- name: bulk_domain_null_required
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (1,1,NULL,2,'abc','abc',false);
-- name: bulk_domain_nonpositive
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (0,1,1,2,'abc','abc',false);
-- name: bulk_domain_division
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (1,0,1,2,'abc','abc',false);
-- name: bulk_domain_ordered_failures
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (0,0,1,2,'abc','abc',false);
-- name: bulk_domain_empty_code
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (1,1,1,2,'','',false);
-- name: bulk_domain_wrong_count
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (1,1,1,3,'abc','abc',false);
-- name: bulk_domain_skipped
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (0,0,NULL,3,'',NULL,true);
-- name: bulk_domain_null_count
INSERT INTO lane_domain_bulk_imports(lane,divisor,optional_lane,recorded_count,label,recorded_label,bypass) VALUES (1,1,1,NULL,'abc','abc',false);

-- name: text_domain_valid
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{1,2}','{1}','{abc}',2,1,'abc',false);
-- name: text_domain_lower_bounds
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('[0:1]={1,2}','{1}','{abc}',2,2,'abc',false);
-- name: text_domain_multidimensional
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{{1,2},{3,4}}','{1}','{abc}',4,NULL,'abc',false);
-- name: text_domain_null_element
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{NULL,2}','{1}','{abc}',2,NULL,'abc',false);
-- name: text_domain_null_arrays
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES (NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: text_domain_empty
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{}','{}','{}',0,NULL,NULL,false);
-- name: text_domain_check_before_input
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{0,bad}','{1}','{abc}',2,0,'abc',false);
-- name: text_domain_input_before_check
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{bad,0}','{1}','{abc}',2,0,'abc',false);
-- name: text_domain_check_before_grammar
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{0,','{1}','{abc}',2,0,'abc',false);
-- name: text_domain_grammar_first
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{','{1}','{abc}',2,0,'abc',false);
-- name: text_domain_required_null
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{1,2}','{NULL}','{abc}',2,1,'abc',false);
-- name: text_domain_code_excess
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{1,2}','{1}','{abcd}',2,1,'abc',false);
-- name: text_domain_code_empty
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{1,2}','{1}','{""}',2,1,'',false);
-- name: text_domain_wrong_count
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{1,2}','{1}','{abc}',3,1,'abc',false);
-- name: text_domain_skipped
INSERT INTO lane_domain_text_imports(payload,required_payload,labels,recorded_count,recorded_first,recorded_code,bypass) VALUES ('{0,bad}','{NULL}','{abcd}',3,0,'wrong',true);

-- name: whole_array_domain_valid
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_truncation
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abcd,efgh}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_null_array
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES (NULL,'{1,2}',NULL,1,NULL,NULL,1,NULL,NULL,false);
-- name: whole_array_domain_null_cells
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{NULL,2}','{NULL,2}','{abc,def}',NULL,'abc',NULL,1,NULL,NULL,false);
-- name: whole_array_domain_wrong_size
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1}','{1,2}','{abc,def}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_bad_input
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{bad,0}','{1,2}','{abc,def}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_required_null
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}',NULL,'{abc,def}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_required_nonpositive
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{0,2}','{abc,def}',0,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_codes_size
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_constructor_nonpositive
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',0,1,'{1,2}',1,false);
-- name: whole_array_domain_constructor_division
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',1,0,'{1,2}',1,false);
-- name: whole_array_domain_constructor_order
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',0,0,'{1,2}',1,false);
-- name: whole_array_domain_wrong_record
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',7,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_wrong_approved
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',1,1,'{1,2}',7,false);
-- name: whole_array_domain_skipped
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{bad}',NULL,'{',7,'wrong',0,0,NULL,7,true);
-- name: whole_array_domain_lower_bounds
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('[0:1]={1,2}','[0:1]={1,2}','{abc,def}',2,'abc',1,1,'[0:1]={1,2}',2,false);
-- name: whole_array_domain_bad_required
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{bad}','{abc,def}',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_bad_codes
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{',1,'abc',1,1,'{1,2}',1,false);
-- name: whole_array_domain_empty_required
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{}','{abc,def}',1,'abc',1,1,'{1,2}',1,false);

-- name: whole_array_domain_precision_first
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',1000,0,'{1,2}',1,false);

-- name: whole_array_domain_precision_bound
INSERT INTO lane_array_domain_imports(payload,required_payload,codes,recorded_first,recorded_code,lane,divisor,approved_pair,recorded_approved,bypass) VALUES ('{1,2}','{1,2}','{abc,def}',1,'abc',1000,1,'{1,2}',1,false);

-- name: polymorphic_domain_valid
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{3,4}','{1}','new',3,2,false,true,1,false);

-- name: polymorphic_domain_wrong_append
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{3,4}','{1}','new',4,2,false,true,1,false);

-- name: polymorphic_domain_wrong_choice
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{3,4}','{1}','new',3,3,false,true,1,false);

-- name: polymorphic_domain_fallback_negative
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{-1,2}','{1}','new',3,2,false,true,1,false);

-- name: polymorphic_domain_reached_fallback
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,NULL,'{-1,2}','{1}','new',1,2,false,false,1,false);

-- name: polymorphic_domain_null_values
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(NULL,NULL,NULL,'{1}',NULL,1,2,false,false,1,false);

-- name: polymorphic_domain_required_null
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{3,4}','{1}','new',3,2,true,true,1,false);

-- name: polymorphic_domain_layout_zero
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{3,4}','{1}','new',3,2,false,true,0,false);

-- name: polymorphic_domain_domain_before_zero
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{-1,2}','{1}','new',3,2,false,true,0,false);

-- name: polymorphic_domain_bypassed
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'{1,2}','{-1,2}','{1}','new',-1,-1,true,true,0,true);

-- name: polymorphic_domain_retained_null
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(NULL,'{1,2}','{3,4}','{1}','new',3,2,false,true,1,false);

-- name: polymorphic_domain_lower_bounds
INSERT INTO lane_polymorphic_allocations(lane,slots,fallback,required_slots,stage,recorded_appended,recorded_choice,check_required,check_layout,divisor,bypass)
VALUES(1,'[0:1]={1,2}','[0:1]={3,4}','{1}','new',3,2,false,false,1,false);

-- name: catalog_coercion_valid
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'{abc,xy}',2,'abc','abc',1,false);

-- name: catalog_coercion_wide_required
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'{abcd,xy}',2,'abc','abc',1,false);

-- name: catalog_coercion_approved_skips_wide
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES('{abc,xy}','{abcd,xy}',2,'abc','abc',1,false);

-- name: catalog_coercion_approved_skips_bad
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES('{abc,xy}','bad',2,'abc','abc',1,false);

-- name: catalog_coercion_nulls
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,NULL,2,NULL,NULL,1,false);

-- name: catalog_coercion_wrong_count
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'{abc,xy}',3,'abc','abc',1,false);

-- name: catalog_coercion_empty
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'{}',0,NULL,NULL,1,false);

-- name: catalog_coercion_domain_failure
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'{"",x}',2,'','',1,false);

-- name: catalog_coercion_error_before_zero
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'{abcd,xy}',2,'abc','abc',0,false);

-- name: catalog_coercion_bypassed
INSERT INTO lane_code_coercions(approved,payload,recorded_count,recorded_code,recorded_explicit,divisor,bypass)
VALUES(NULL,'bad',-1,'ignored','ignored',0,true);

-- name: nested_groups_valid
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,5,1,1,3,2,1,2,false);

-- name: nested_groups_wrong_count
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',3,2,5,1,1,3,2,1,2,false);

-- name: nested_groups_wrong_first
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,5,9,1,3,2,1,2,false);

-- name: nested_groups_wrong_lower
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,-3,1,1,3,2,1,2,false);

-- name: nested_groups_wrong_slice
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,5,1,2,3,2,1,2,false);

-- name: nested_groups_wrong_append
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,5,1,1,4,2,1,2,false);

-- name: nested_groups_wrong_construct
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,5,1,1,3,3,1,2,false);

-- name: nested_groups_zero_divisor
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',2,2,5,1,1,3,2,0,2,false);

-- name: nested_groups_nulls
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,1,NULL,false);

-- name: nested_groups_empty
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{}','{1,2}','{3,4}',0,NULL,NULL,NULL,0,1,2,1,2,false);

-- name: nested_groups_bypassed
INSERT INTO lane_group_allocations(groups,first_group,second_group,expected_count,expected_size,expected_lower,expected_first,expected_slice,expected_append,expected_construct,divisor,expected_scaled,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{1,2}','{3,4}',-1,-1,-1,-1,-1,-1,-1,0,-1,true);

-- name: nested_domain_text_valid
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}',2,1,1,false);

-- name: nested_domain_text_lower_bounds
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"[5:6]={1,2}"}','{"{1,2}"}',1,NULL,1,false);

-- name: nested_domain_text_nulls
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,1,false);

-- name: nested_domain_text_empty
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{}','{}',0,NULL,1,false);

-- name: nested_domain_text_wrong_count
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}',3,1,1,false);

-- name: nested_domain_text_wrong_first
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}',2,9,1,false);

-- name: nested_domain_text_domain_before_syntax
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1}","{bad}"}','{"{1,2}"}',2,1,1,false);

-- name: nested_domain_text_syntax_before_domain
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{bad}","{1}"}','{"{1,2}"}',2,1,1,false);

-- name: nested_domain_text_required_null
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{NULL}',2,1,1,false);

-- name: nested_domain_text_required_positive
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{-1,2}"}',2,1,1,false);

-- name: nested_domain_text_zero_divisor
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}',2,1,0,false);

-- name: nested_domain_text_input_before_zero
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('{bad}','{"{1,2}"}',2,1,0,false);

-- name: nested_domain_text_bypassed
INSERT INTO lane_group_text_imports(payload,required_payload,expected_count,expected_first,divisor,bypass)
VALUES('bad','bad',-1,-1,0,true);

-- name: nested_export_valid
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','{1,2}|{3,4}','{1,2}',1,false);

-- name: nested_export_bounds
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"[5:6]={1,2}","[-3:-2]={3,4}"}','{"[5:6]={1,2}","[-3:-2]={3,4}"}','[5:6]={1,2}|[-3:-2]={3,4}','[5:6]={1,2}',1,false);

-- name: nested_export_null_cell
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{NULL,"{1,2}"}','{NULL,"{1,2}"}','<NULL>|{1,2}',NULL,1,false);

-- name: nested_export_multidimensional
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{{"{1,2}","{3,4}"},{"{5,6}",NULL}}','{{"{1,2}","{3,4}"},{"{5,6}",NULL}}','{1,2}|{3,4}|{5,6}|<NULL>',NULL,1,false);

-- name: nested_export_nulls
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,1,false);

-- name: nested_export_empty
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{}','{}','',NULL,1,false);

-- name: nested_export_wrong_text
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','wrong','{1,2}|{3,4}','{1,2}',1,false);

-- name: nested_export_wrong_join
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','wrong','{1,2}',1,false);

-- name: nested_export_wrong_first
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','{1,2}|{3,4}','wrong',1,false);

-- name: nested_export_zero_divisor
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','{1,2}|{3,4}','{1,2}',0,false);

-- name: nested_export_bypassed
INSERT INTO lane_group_exports(groups,recorded_text,recorded_join,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','wrong','wrong','wrong',0,true);

-- name: nested_cast_valid
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','{"{1.0,2.0}","{3.0,4.0}"}',1,1,false);

-- name: nested_cast_bounds
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"[5:6]={1,2}"}','{"[5:6]={1,2}"}','{"[5:6]={1.0,2.0}"}',NULL,1,false);

-- name: nested_cast_nulls
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,1,false);

-- name: nested_cast_empty
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{}','{}','{}',NULL,1,false);

-- name: nested_cast_wrong_text
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','wrong',1,1,false);

-- name: nested_cast_wrong_first
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','{"{1.0,2.0}","{3.0,4.0}"}',9,1,false);

-- name: nested_cast_range
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{100,2}"}','{"{100,2}"}','ignored',100,1,false);

-- name: nested_cast_required_null
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{NULL}','{NULL}','{NULL}',NULL,1,false);

-- name: nested_cast_positive_before_zero
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{-1,2}"}','{"{-1,2}"}','{"{-1.0,2.0}"}',-1,0,false);

-- name: nested_cast_zero_divisor
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}","{3,4}"}','{"{1.0,2.0}","{3.0,4.0}"}',1,0,false);

-- name: nested_cast_bad_input
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','bad','{"{1.0,2.0}","{3.0,4.0}"}',1,1,false);

-- name: nested_cast_bypassed
INSERT INTO lane_group_casts(groups,payload,recorded_text,recorded_first,divisor,bypass)
VALUES('{"{1,2}","{3,4}"}','bad','wrong',-1,0,true);

-- name: nested_compare_valid
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',1,1,true,true,'{"{1,2}","{3,4}"}',false);

-- name: nested_compare_bounds
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"[5:6]={1,2}","{1,2}"}','{"{1,2}"}','{1,2}',1,2,true,true,'{"{1,2}","[5:6]={1,2}"}',false);

-- name: nested_compare_duplicates
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{1,2}"}','{"{1,2}"}','{1,2}',1,1,true,true,'{"{1,2}","{1,2}"}',false);

-- name: nested_compare_null_cell
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{NULL,"{1,2}"}','{NULL}',NULL,1,1,false,NULL,'{"{1,2}",NULL}',false);

-- name: nested_compare_inner_nulls
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{NULL,NULL}","{1,2}"}','{"{NULL,NULL}"}','{NULL,NULL}',1,1,true,true,'{"{1,2}","{NULL,NULL}"}',false);

-- name: nested_compare_nulls
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: nested_compare_empty
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{}','{}','{1,2}',0,NULL,true,false,'{}',false);

-- name: nested_compare_wrong_order
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',9,1,true,true,'{"{1,2}","{3,4}"}',false);

-- name: nested_compare_wrong_position
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',1,9,true,true,'{"{1,2}","{3,4}"}',false);

-- name: nested_compare_wrong_contains
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',1,1,false,true,'{"{1,2}","{3,4}"}',false);

-- name: nested_compare_wrong_any
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',1,1,true,false,'{"{1,2}","{3,4}"}',false);

-- name: nested_compare_wrong_sort
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',1,1,true,true,'wrong',false);

-- name: nested_compare_bypassed
INSERT INTO lane_group_comparisons(groups,thresholds,requested,expected_order,expected_position,expected_contains,expected_any,expected_sort,bypass)
VALUES('{"{1,2}","{3,4}"}','{"{1,2}"}','{1,2}',9,9,false,false,'wrong',true);

-- name: nested_hash_valid
INSERT INTO lane_group_hashes(groups,payload,seed,expected_hash,expected_seeded,bypass)
VALUES('{"{1,2}",NULL,"{3,4}"}','{"{1,2}",NULL,"{3,4}"}',42,1786655877,-3013670091533766778,false);

-- name: nested_hash_bounds_independent
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('[5:7]={"{1,2}",NULL,"{3,4}"}',42,1786655877,-3013670091533766778,false);

-- name: nested_hash_nulls
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES(NULL,42,NULL,NULL,false);

-- name: nested_hash_empty
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{}',42,1,1,false);

-- name: nested_hash_null_group
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{NULL}',42,31,31,false);

-- name: nested_hash_inner_null_cells
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{"{NULL,NULL}"}',42,992,992,false);

-- name: nested_hash_null_seed
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{NULL}',NULL,31,NULL,false);

-- name: nested_hash_wrong_plain
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{"{1,2}",NULL,"{3,4}"}',42,0,-3013670091533766778,false);

-- name: nested_hash_wrong_seeded
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{"{1,2}",NULL,"{3,4}"}',42,1786655877,0,false);

-- name: nested_hash_bad_group
INSERT INTO lane_group_hashes(groups,payload,seed,expected_hash,expected_seeded,bypass)
VALUES('{}','{"{1}"}',42,1,1,false);

-- name: nested_hash_bypassed
INSERT INTO lane_group_hashes(groups,seed,expected_hash,expected_seeded,bypass)
VALUES('{"{1,2}",NULL,"{3,4}"}',42,0,0,true);

-- name: nested_hash_wrong_input_hash
INSERT INTO lane_group_hashes(groups,payload,seed,expected_hash,expected_seeded,bypass)
VALUES('{}','{NULL}',42,1,1,false);

-- name: nested_json_valid
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{"{1,2}",NULL,"{3,4}"}','{"{1,2}",NULL,"{3,4}"}','[[1,2],null,[3,4]]','[[1,2],null,[3,4]]','[[1,2],null,[3,4]]',false);

-- name: nested_json_bounds_independent
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('[5:7]={"{1,2}",NULL,"{3,4}"}',NULL,'[[1,2],null,[3,4]]','[[1,2],null,[3,4]]','[[1,2],null,[3,4]]',false);

-- name: nested_json_nulls
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,false);

-- name: nested_json_empty
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{}',NULL,'[]','[]','[]',false);

-- name: nested_json_null_group
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{NULL}',NULL,'[null]','[null]','[null]',false);

-- name: nested_json_inner_nulls
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{"{NULL,NULL}"}',NULL,'[[null,null]]','[[null,null]]','[[null,null]]',false);

-- name: nested_json_multidimensional
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('[5:6][3:3]={{"{1,2}"},{"{3,4}"}}',NULL,'[[[1,2]],[[3,4]]]','[[[1,2]],[[3,4]]]','[[1,2],[3,4]]',false);

-- name: nested_json_wrong_raw
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{"{1,2}"}',NULL,'wrong','[[1,2]]','[[1,2]]',false);

-- name: nested_json_wrong_binary
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{"{1,2}"}',NULL,'[[1,2]]','[1,2]','[[1,2]]',false);

-- name: nested_json_wrong_flat
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('[5:6][3:3]={{"{1,2}"},{"{3,4}"}}',NULL,'[[[1,2]],[[3,4]]]','[[[1,2]],[[3,4]]]','[[[1,2]],[[3,4]]]',false);

-- name: nested_json_bad_domain_input
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{}','{"{1}"}','[]','[]','[]',false);

-- name: nested_json_bad_text_input
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{}','bad','[]','[]','[]',false);

-- name: nested_json_bypassed
INSERT INTO lane_group_json_exports(groups,payload,expected_raw,expected_binary,expected_flat,bypass)
VALUES('{"{1,2}"}','bad','wrong','null','null',true);

-- name: enum_json_valid
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES('new','done','{"{new,done}"}','["new","done"]','["new", "done"]','[["new","done"]]',false);

-- name: enum_json_nulls
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES(NULL,NULL,NULL,'[null,null]','[null, null]',NULL,false);

-- name: enum_json_empty_groups
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES(NULL,'new','{}','[null,"new"]','[null, "new"]','[]',false);

-- name: enum_json_wrong_binary
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES('new','done','{"{new,done}"}','["done","new"]','["new", "done"]','[["new","done"]]',false);

-- name: enum_json_wrong_raw
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES('new','done','{"{new,done}"}','["new","done"]','wrong','[["new","done"]]',false);

-- name: enum_json_wrong_groups
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES('new','done','{"{new,done}"}','["new","done"]','["new", "done"]','[null]',false);

-- name: enum_json_bypassed
INSERT INTO lane_enum_json_exports(first_stage,second_stage,groups,expected_binary,expected_raw,expected_groups,bypass)
VALUES('new','done','{"{new,done}"}','null','wrong','null',true);

-- name: jsonb_enum_wrong_labels
INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{new,done}', '["done","new"]', false);

-- name: catalog_array_valid
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{1,NULL,3}','{1010,11,NULL}','{"abcd","x ",NULL}','{1.25,12.34,NULL}','1|N|3','1010|11|N','abcd|x |N','1.3|12.3|N',2,1,false);

-- name: catalog_array_empty
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{}','{}','{}','','','','',NULL,1,false);

-- name: catalog_array_null
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,false);

-- name: catalog_array_bounds
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('[-2:0]={1,NULL,3}','{1010,11,NULL}','{"abcd","x ",NULL}','{1.25,12.34,NULL}','1|N|3','1010|11|N','abcd|x |N','1.3|12.3|N',32767,1,false);

-- name: catalog_array_wrong_lanes
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{1,NULL,3}','{}','{}','{}','wrong','','','',2,1,false);

-- name: catalog_array_wrong_bits
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{1010,11,NULL}','{}','{}','','wrong','','',2,1,false);

-- name: catalog_array_wrong_labels
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{}','{"abcd","x ",NULL}','{}','','','wrong','',2,1,false);

-- name: catalog_array_wrong_amounts
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{}','{}','{1.25,12.34,NULL}','','','','wrong',2,1,false);

-- name: catalog_array_bad_lane
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{bad}','{}','{}','{}','','','','',2,1,false);

-- name: catalog_array_bad_bits
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{102}','{}','{}','','','','',2,1,false);

-- name: catalog_array_amount_overflow
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{}','{}','{1000}','','','','',2,1,false);

-- name: catalog_array_narrowing_overflow
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{}','{}','{}','','','','',32768,1,false);

-- name: catalog_array_division_error
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('{}','{}','{}','{}','','','','',2,0,false);

-- name: catalog_array_bypassed
INSERT INTO lane_catalog_array_exports(lanes,bits,labels,amounts,expected_lanes,expected_bits,expected_labels,expected_amounts,quantity,divisor,bypass)
VALUES('bad','bad','bad','bad','wrong','wrong','wrong','wrong',32768,0,true);

-- name: reservation_normal
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,false,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_alternate
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',true,8,false,true,false,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_wrong_end
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',true,7,false,true,false,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_wrong_upper_flag
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,true,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_below_floor
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,false,false,false,false,false,10,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_after_local_limit
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,false,false,false,false,false,0,'2000-01-01 00:00:00.000001','1999-12-31 00:00:00+00',1,false);

-- name: reservation_before_instant_limit
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,false,false,false,false,false,0,'2000-01-04','2000-01-02 00:00:00+00',1,false);

-- name: reservation_division_error
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,false,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',0,false);

-- name: reservation_bypassed
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','[1.00,9.00)','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,7,true,true,false,false,false,false,false,1000,'2000-01-04','1999-12-31 00:00:00+00',0,true);

-- name: reservation_empty
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('empty','[2,8)','empty','empty','empty','empty','empty',false,NULL,true,false,false,false,false,true,true,0,'2000-01-04','1999-12-31 00:00:00+00',0,false);

-- name: reservation_null
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,NULL,NULL,NULL,NULL,true,true,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_null_fallback
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES(NULL,'[2,8)',NULL,NULL,NULL,NULL,NULL,true,8,NULL,NULL,NULL,NULL,NULL,true,true,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_unbounded
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('(,)','[2,8)','(,)','(,)','(,)','(,)','(,)',false,NULL,false,false,false,true,true,true,true,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_points
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,1]','[2,8)','[9007199254740993,9007199254740993]','[1.00,1.00]','[2000-01-01,2000-01-01]','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000001]','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000001+00]',false,2,false,true,true,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: reservation_mixed_empty
INSERT INTO lane_reservation_windows(span,alternate_span,loads,price_band,service_days,local_shift,instant_shift,prefer_alternate,expected_end,expected_empty,expected_lower_inc,expected_continuous_upper_inc,expected_lower_inf,expected_upper_inf,expected_lower_null,expected_upper_null,minimum,latest_local,earliest_instant,denominator,bypass)
VALUES('[1,9)','[2,8)','[9007199254740993,9007199254740999)','empty','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002)','[2000-01-01 00:00:00.000001+00,2000-01-01 00:00:00.000002+00)',false,9,false,true,false,false,false,false,false,0,'2000-01-04','1999-12-31 00:00:00+00',1,false);

-- name: constructor_normal
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_inclusive
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[]',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_exclusive
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','()',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_right_inclusive
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','(]',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_wrong_empty
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',true,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_wide_limit
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254740998,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_price_floor
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,-1,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_day_limit
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-02','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_local_floor
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','2000-01-02','2000-01-05 00:00:00+00',1,false);

-- name: constructor_instant_limit
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-02 00:00:00+00',1,false);

-- name: constructor_invalid_flags
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','invalid',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_null_flags
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00',NULL,false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_reversed
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(4,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_flags_before_order
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(4,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','invalid',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_int4_overflow
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(2147483647,NULL,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','()',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_int8_overflow
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9223372036854775807,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[]',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_date_overflow
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','5874897-12-31','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[]',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_division_error
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',0,false);

-- name: constructor_bypass
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,3,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','invalid',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',0,true);

-- name: constructor_unbounded
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[]',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_empty
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,1,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','()',true,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_point
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(1,1,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[]',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: constructor_max_lower
INSERT INTO lane_constructor_windows(low_bound,high_bound,low_wide,high_wide,low_price,high_price,low_day,high_day,low_local,high_local,low_instant,high_instant,bound_flags,expected_empty,ceiling_wide,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(2147483647,NULL,9007199254740993,9007199254740999,1.2300,3.4500,'2000-01-01','2000-01-03','2000-01-01 00:00:00.000001','2000-01-03','2000-01-01 00:00:00+00','2000-01-03 00:00:00+00','[)',false,9007199254741000,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_normal
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_quoted
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('["1","3")','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_whitespace
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('  [ 1, 3 )  ','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_wrong_empty
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',true,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_wrong_end
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,2,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_load_limit
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254741001)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_price_floor
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,2,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_day_limit
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-02','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_local_floor
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','2000-01-02','2000-01-05 00:00:00+00',1,false);

-- name: range_import_instant_limit
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-02 00:00:00+00',1,false);

-- name: range_import_syntax
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)junk','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_lower_error
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[bad,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_reverse
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[3,1)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_lower_overflow
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[2147483648,bad)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_first_syntax
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[2147483648,3','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_upper_error
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[bad,2147483648)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_domain_negative
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[-1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_division_error
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',0,false);

-- name: range_import_bypass
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('malformed','[9007199254740993,9007199254740999)','malformed','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',0,true);

-- name: range_import_empty
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('empty','empty','empty','empty','empty','empty',true,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_null
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_unbounded
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('(,)','(,)','(,)','(,)','(,)','(,)',false,3,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_import_point
INSERT INTO lane_range_imports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_end,minimum_price,latest_day,earliest_local,latest_instant,divisor,bypass)
VALUES('[1,1]','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)',false,2,0,'2000-01-05','1999-12-31','2000-01-05 00:00:00+00',1,false);

-- name: range_export_exact
INSERT INTO lane_range_exports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_slots,expected_loads,expected_prices,expected_days,expected_local,expected_instant,slot_prefix,imported,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[-0.00,1.2300]','[-infinity,infinity]','[-infinity,infinity]','[-infinity,infinity]','[1,3)','[9007199254740993,9007199254740999)','[0.00,1.2300]','[-infinity,infinity]','[-infinity,infinity]','[-infinity,infinity]','[1,','(0,2]',1,false);

-- name: range_export_slot_mismatch
INSERT INTO lane_range_exports(slots,expected_slots,slot_prefix,imported,divisor,bypass)
VALUES('[1,3)','[1,4)','[1,','[1,3)',1,false);

-- name: range_export_wide_mismatch
INSERT INTO lane_range_exports(loads,expected_loads,divisor,bypass)
VALUES('[9007199254740993,9007199254740999)','[9007199254740992,9007199254740999)',1,false);

-- name: range_export_scale_mismatch
INSERT INTO lane_range_exports(prices,expected_prices,divisor,bypass)
VALUES('[1.2300,3.4500]','[1.23,3.45]',1,false);

-- name: range_export_day_mismatch
INSERT INTO lane_range_exports(calendar_days,expected_days,divisor,bypass)
VALUES('[-infinity,infinity]','(-infinity,infinity)',1,false);

-- name: range_export_local_mismatch
INSERT INTO lane_range_exports(local_shift,expected_local,divisor,bypass)
VALUES('[-infinity,infinity]','[-infinity,infinity)',1,false);

-- name: range_export_instant_mismatch
INSERT INTO lane_range_exports(instant_shift,expected_instant,divisor,bypass)
VALUES('[-infinity,infinity]','[-infinity,infinity)',1,false);

-- name: range_export_empty
INSERT INTO lane_range_exports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_slots,expected_loads,expected_prices,expected_days,expected_local,expected_instant,slot_prefix,imported,divisor,bypass)
VALUES('empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','emp','empty',1,false);

-- name: range_export_unbounded
INSERT INTO lane_range_exports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_slots,expected_loads,expected_prices,expected_days,expected_local,expected_instant,slot_prefix,imported,divisor,bypass)
VALUES('(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)',1,false);

-- name: range_export_null
INSERT INTO lane_range_exports(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_slots,expected_loads,expected_prices,expected_days,expected_local,expected_instant,slot_prefix,imported,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,false);

-- name: range_export_prefix_mismatch
INSERT INTO lane_range_exports(slots,expected_slots,slot_prefix,imported,divisor,bypass)
VALUES('[1,3)','[1,3)','[2,','[1,3)',1,false);

-- name: range_export_domain_failure
INSERT INTO lane_range_exports(slots,expected_slots,slot_prefix,imported,divisor,bypass)
VALUES('[-1,3)','[-1,3)','[-1','[-1,3)',1,false);

-- name: range_export_import_mismatch
INSERT INTO lane_range_exports(slots,expected_slots,slot_prefix,imported,divisor,bypass)
VALUES('[1,3)','[1,3)','[1,','[1,4)',1,false);

-- name: range_export_import_syntax
INSERT INTO lane_range_exports(slots,expected_slots,slot_prefix,imported,divisor,bypass)
VALUES('[1,3)','[1,3)','[1,','[1,3)junk',1,false);

-- name: range_export_import_overflow
INSERT INTO lane_range_exports(imported,divisor,bypass)
VALUES('[2147483648,bad)',1,false);

-- name: range_export_constructor_error
INSERT INTO lane_range_exports(divisor,bypass)
VALUES(0,false);

-- name: range_export_constructor_mismatch
INSERT INTO lane_range_exports(divisor,bypass)
VALUES(3,false);

-- name: range_export_bypass
INSERT INTO lane_range_exports(slots,calendar_days,local_shift,instant_shift,imported,divisor,bypass)
VALUES('[-1,3)','[2000-01-02,2000-03-04)','[2000-01-02,2000-03-04)','[2000-01-02 00:00:00+00,2000-03-04 00:00:00+00)','invalid',0,true);

-- name: range_relation_touching
INSERT INTO lane_range_relations(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,expected_order,expected_contains,expected_overlap,expected_adjacent,bypass)
VALUES('[1,3)','[3,5)','[9007199254740993,9007199254740999)','[9007199254740999,9007199254741001)','[1.2300,3.4500)','[3.45,5.67)','[2000-01-01,2000-01-03)','[2000-01-03,2000-01-05)','[2000-01-01,2000-01-03)','[2000-01-03,2000-01-05)','[2000-01-01 00:00:00+00,2000-01-03 00:00:00+00)','[2000-01-03 00:00:00+00,2000-01-05 00:00:00+00)',-1,false,false,true,false);

-- name: range_relation_unbounded
INSERT INTO lane_range_relations(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,expected_order,expected_contains,expected_overlap,expected_adjacent,bypass)
VALUES('(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)','(,)',0,true,true,false,false);

-- name: range_relation_empty
INSERT INTO lane_range_relations(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,expected_order,expected_contains,expected_overlap,expected_adjacent,bypass)
VALUES('empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty',0,true,false,false,false);

-- name: range_relation_null
INSERT INTO lane_range_relations(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,expected_order,expected_contains,expected_overlap,expected_adjacent,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: range_relation_order_mismatch
INSERT INTO lane_range_relations(slots,other_slots,expected_order,bypass)
VALUES('[1,3)','[3,5)',1,false);

-- name: range_relation_wide_mismatch
INSERT INTO lane_range_relations(loads,other_loads,expected_order,bypass)
VALUES('[9007199254740993,9007199254740999)','[9007199254740999,9007199254741001)',1,false);

-- name: range_relation_price_mismatch
INSERT INTO lane_range_relations(prices,other_prices,expected_order,bypass)
VALUES('[1.2300,3.4500)','[3.45,5.67)',1,false);

-- name: range_relation_day_mismatch
INSERT INTO lane_range_relations(calendar_days,other_days,expected_order,bypass)
VALUES('[2000-01-01,2000-01-03)','[2000-01-03,2000-01-05)',1,false);

-- name: range_relation_local_mismatch
INSERT INTO lane_range_relations(local_shift,other_local,expected_order,bypass)
VALUES('[2000-01-01,2000-01-03)','[2000-01-03,2000-01-05)',1,false);

-- name: range_relation_instant_mismatch
INSERT INTO lane_range_relations(instant_shift,other_instant,expected_order,bypass)
VALUES('[2000-01-01 00:00:00+00,2000-01-03 00:00:00+00)','[2000-01-03 00:00:00+00,2000-01-05 00:00:00+00)',1,false);

-- name: range_relation_bypass
INSERT INTO lane_range_relations(slots,other_slots,expected_order,bypass)
VALUES('[1,3)','[3,5)',1,true);

-- name: range_algebra_overlap
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[1,4)','[3,6)','[1,6)','[3,4)','[1,3)','[1,6)','[3,6)',2,true,1,false);

-- name: range_algebra_touching
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[1,3)','[3,6)','[1,6)','empty','[1,3)','[1,6)','[3,6)',3,false,1,false);

-- name: range_algebra_equal
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[3,6)','[3,6)','[3,6)','[3,6)','empty','[3,6)','[3,6)',3,true,1,false);

-- name: range_algebra_empty
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('empty','empty','empty','empty','empty','empty','empty',3,false,1,false);

-- name: range_algebra_null
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: range_algebra_union_mismatch
INSERT INTO lane_range_algebra(combined,bypass)
VALUES('empty',false);

-- name: range_algebra_intersection_mismatch
INSERT INTO lane_range_algebra(shared,bypass)
VALUES('empty',false);

-- name: range_algebra_difference_mismatch
INSERT INTO lane_range_algebra(remaining,bypass)
VALUES('empty',false);

-- name: range_algebra_hull_mismatch
INSERT INTO lane_range_algebra(hull,bypass)
VALUES('empty',false);

-- name: range_algebra_choice_mismatch
INSERT INTO lane_range_algebra(preferred,bypass)
VALUES('empty',false);

-- name: range_algebra_element_mismatch
INSERT INTO lane_range_algebra(expected_contains,bypass)
VALUES(true,false);

-- name: range_algebra_union_gap
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[1,2)','[4,6)','[1,6)','empty','[1,2)','[1,6)','[4,6)',1,true,1,false);

-- name: range_algebra_difference_split
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[1,7)','[3,6)','[1,7)','[3,6)','empty','[1,7)','[3,6)',2,true,1,false);

-- name: range_algebra_division_error
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[1,4)','[3,6)','[1,6)','[3,4)','[1,3)','[1,6)','[3,6)',2,true,0,false);

-- name: range_algebra_bypass
INSERT INTO lane_range_algebra(slots,other_slots,combined,shared,remaining,hull,preferred,needle,expected_contains,divisor,bypass)
VALUES('[1,7)','[3,6)','empty','empty','empty','empty','empty',2,false,0,true);

-- name: range_fingerprint_exact
INSERT INTO lane_range_fingerprints(slots,loads,prices,calendar_days,local_shift,instant_shift,slot_wire,load_wire,price_wire,day_wire,local_wire,instant_wire,expected_hashes,expected_extended,seed,divisor,bypass)
VALUES('[1,3)','[9007199254740993,9007199254740999)','[1.2300,3.4500]','[2000-01-01,2000-01-03)','[2000-01-01 00:00:00.000001,2000-01-03)','[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)','0200000004000000010000000400000003','02000000080020000000000001000000080020000000000007','060000000c0002000000000004000108fc0000000c000200000000000400031194','0200000004000000000000000400000002','0200000008000000000000000100000008000000283baec000','0200000008000000000000000100000008000000283baec000','{1703467254,-1554099970,-1380870083,467592261,1748224218,1748224218}','{-4335437796229240288,-8589005862461177276,-1238855550051607966,917891151693048008,-4764102050186199970,-4764102050186199970}',-1,1,false);

-- name: range_fingerprint_empty
INSERT INTO lane_range_fingerprints(slots,loads,prices,calendar_days,local_shift,instant_shift,slot_wire,load_wire,price_wire,day_wire,local_wire,instant_wire,expected_hashes,expected_extended,seed,divisor,bypass)
VALUES('empty','empty','empty','empty','empty','empty','01','01','01','01','01','01','{484847245,484847245,484847245,484847245,484847245,484847245}','{-7341197756718502259,-7341197756718502259,-7341197756718502259,-7341197756718502259,-7341197756718502259,-7341197756718502259}',0,1,false);

-- name: range_fingerprint_unbounded
INSERT INTO lane_range_fingerprints(slots,loads,prices,calendar_days,local_shift,instant_shift,slot_wire,load_wire,price_wire,day_wire,local_wire,instant_wire,expected_hashes,expected_extended,seed,divisor,bypass)
VALUES('(,)','(,)','(,)','(,)','(,)','(,)','18','18','18','18','18','18','{1061745599,1061745599,1061745599,1061745599,1061745599,1061745599}','{8453741880185254847,8453741880185254847,8453741880185254847,8453741880185254847,8453741880185254847,8453741880185254847}',0,1,false);

-- name: range_fingerprint_extremes
INSERT INTO lane_range_fingerprints(slots,loads,prices,calendar_days,local_shift,instant_shift,slot_wire,load_wire,price_wire,day_wire,local_wire,instant_wire,expected_hashes,expected_extended,seed,divisor,bypass)
VALUES('[-2147483648,2147483647)','[-9223372036854775808,9223372036854775807)','[Infinity,NaN]','[-infinity,infinity]','[-infinity,infinity]','[-infinity,infinity]','020000000480000000000000047fffffff','02000000088000000000000000000000087fffffffffffffff','060000000800000000d00000200000000800000000c0000000','060000000480000000000000047fffffff','06000000088000000000000000000000087fffffffffffffff','06000000088000000000000000000000087fffffffffffffff','{927879312,-697390468,1132062176,-217445220,304805488,304805488}','{-5959418261589374919,8557432845489565814,-7393449346706181345,5461890362622359935,-8050897746859982544,-8050897746859982544}',-9223372036854775808,1,false);

-- name: range_fingerprint_null
INSERT INTO lane_range_fingerprints(slots,loads,prices,calendar_days,local_shift,instant_shift,slot_wire,load_wire,price_wire,day_wire,local_wire,instant_wire,expected_hashes,expected_extended,seed,divisor,bypass)
VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: range_fingerprint_slot_mismatch
INSERT INTO lane_range_fingerprints(slots,slot_wire,expected_hashes,bypass)
VALUES('[1,3)','ff','{1703467254,NULL,NULL,NULL,NULL,NULL}',false);

-- name: range_fingerprint_load_mismatch
INSERT INTO lane_range_fingerprints(loads,load_wire,expected_hashes,bypass)
VALUES('[9007199254740993,9007199254740999)','ff','{NULL,-1554099970,NULL,NULL,NULL,NULL}',false);

-- name: range_fingerprint_price_mismatch
INSERT INTO lane_range_fingerprints(prices,price_wire,expected_hashes,bypass)
VALUES('[1.2300,3.4500]','ff','{NULL,NULL,-1380870083,NULL,NULL,NULL}',false);

-- name: range_fingerprint_day_mismatch
INSERT INTO lane_range_fingerprints(calendar_days,day_wire,expected_hashes,bypass)
VALUES('[2000-01-01,2000-01-03)','ff','{NULL,NULL,NULL,467592261,NULL,NULL}',false);

-- name: range_fingerprint_local_mismatch
INSERT INTO lane_range_fingerprints(local_shift,local_wire,expected_hashes,bypass)
VALUES('[2000-01-01 00:00:00.000001,2000-01-03)','ff','{NULL,NULL,NULL,NULL,1748224218,NULL}',false);

-- name: range_fingerprint_instant_mismatch
INSERT INTO lane_range_fingerprints(instant_shift,instant_wire,expected_hashes,bypass)
VALUES('[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)','ff','{NULL,NULL,NULL,NULL,NULL,1748224218}',false);

-- name: range_fingerprint_hash_mismatch
INSERT INTO lane_range_fingerprints(expected_hashes,bypass)
VALUES('{0,NULL,NULL,NULL,NULL,NULL}',false);

-- name: range_fingerprint_extended_mismatch
INSERT INTO lane_range_fingerprints(expected_extended,bypass)
VALUES('{0,NULL,NULL,NULL,NULL,NULL}',false);

-- name: range_fingerprint_seed_error
INSERT INTO lane_range_fingerprints(seed,divisor,bypass)
VALUES(1,0,false);

-- name: range_fingerprint_bypass
INSERT INTO lane_range_fingerprints(slots,slot_wire,seed,divisor,bypass)
VALUES('[1,3)','ff',1,0,true);

-- name: range_batch_exact
INSERT INTO lane_range_batches(slots,loads,prices,calendar_days,local_shift,instant_shift,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{"[1,3)",empty,NULL}','{"[9007199254740993,9007199254740999)",empty,NULL}','{"[1.2300,3.4500]",empty,NULL}','{"[2000-01-01,2000-01-03)",empty,NULL}','{"[2000-01-01 00:00:00.000001,2000-01-03)",empty,NULL}','{"[2000-01-01 00:00:00.000001+00,2000-01-03 00:00:00+00)",empty,NULL}','[1,3)','{3,3,3,3,3,3}',true,false,false);

-- name: range_batch_empty
INSERT INTO lane_range_batches(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{}','{}','{}','{}','{}','{0,0,0,0,0,0}',false,true,false);

-- name: range_batch_null
INSERT INTO lane_range_batches(slots,expected_counts,expected_member,expected_sorted,bypass)
VALUES(NULL,NULL,NULL,NULL,false);

-- name: range_batch_null_cells
INSERT INTO lane_range_batches(slots,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{NULL,NULL,NULL}','{3}',NULL,true,false);

-- name: range_batch_lower_bound
INSERT INTO lane_range_batches(slots,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('[-2:0]={"[1,3)",empty,NULL}','[1,3)','{3}',true,false,false);

-- name: range_batch_canonical
INSERT INTO lane_range_batches(slots,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{"(1,3]",empty,NULL}','[2,4)','{3}',true,false,false);

-- name: range_batch_temporal_infinity
INSERT INTO lane_range_batches(calendar_days,local_shift,instant_shift,expected_counts,bypass)
VALUES('{"[-infinity,infinity]",empty,NULL}','{"[-infinity,infinity]",empty,NULL}','{"[-infinity,infinity]",empty,NULL}','{NULL,NULL,NULL,3,3,3}',false);

-- name: range_batch_slots_count_mismatch
INSERT INTO lane_range_batches(slots,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{1,NULL,NULL,NULL,NULL,NULL}',false,true,false);

-- name: range_batch_loads_count_mismatch
INSERT INTO lane_range_batches(loads,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{NULL,1,NULL,NULL,NULL,NULL}',NULL,NULL,false);

-- name: range_batch_prices_count_mismatch
INSERT INTO lane_range_batches(prices,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{NULL,NULL,1,NULL,NULL,NULL}',NULL,NULL,false);

-- name: range_batch_calendar_days_count_mismatch
INSERT INTO lane_range_batches(calendar_days,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{NULL,NULL,NULL,1,NULL,NULL}',NULL,NULL,false);

-- name: range_batch_local_shift_count_mismatch
INSERT INTO lane_range_batches(local_shift,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{NULL,NULL,NULL,NULL,1,NULL}',NULL,NULL,false);

-- name: range_batch_instant_shift_count_mismatch
INSERT INTO lane_range_batches(instant_shift,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{}','{NULL,NULL,NULL,NULL,NULL,1}',NULL,NULL,false);

-- name: range_batch_first_mismatch
INSERT INTO lane_range_batches(slots,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{"[1,3)"}','[4,5)','{1}',false,true,false);

-- name: range_batch_member_mismatch
INSERT INTO lane_range_batches(slots,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{empty}','empty','{1}',false,true,false);

-- name: range_batch_sort_mismatch
INSERT INTO lane_range_batches(slots,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{empty}','empty','{1}',true,false,false);

-- name: range_batch_domain
INSERT INTO lane_range_batches(typed_slots,histories,head,bypass)
VALUES('{"[1,3)",NULL,empty}','{"{\"[1,3)\",NULL,empty}"}','[1,3)',false);

-- name: range_batch_domain_mismatch
INSERT INTO lane_range_batches(typed_slots,head,bypass)
VALUES('{empty}','[1,3)',false);

-- name: range_batch_nested_mismatch
INSERT INTO lane_range_batches(histories,head,bypass)
VALUES('{"{empty}"}','[1,3)',false);

-- name: range_batch_bypass
INSERT INTO lane_range_batches(slots,typed_slots,histories,head,expected_counts,expected_member,expected_sorted,bypass)
VALUES('{empty}','{empty}','{"{empty}"}','[1,3)','{99,99,99,99,99,99}',false,false,true);

-- name: shift_segments_null
INSERT INTO lane_shift_segments(expected_missing,bypass) VALUES(true,false);

-- name: shift_segments_empty
INSERT INTO lane_shift_segments(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_bounded,expected_missing,bypass)
VALUES('{}','{}','{}','{}','{}','{}',true,false,false,false);

-- name: shift_segments_separated
INSERT INTO lane_shift_segments(slots,loads,prices,calendar_days,local_shift,instant_shift,slot_floor,load_floor,price_ceiling,day_floor,local_ceiling,instant_floor,expected_empty,expected_bounded,expected_missing,choose_alternate,bypass)
VALUES('{[7,9),[1,3)}','{[9007199254740997,9007199254740999),[9007199254740993,9007199254740995)}','{[1.2300,2.4500],[7.000,9.1000]}','{[2000-01-01,2000-01-03),[2000-01-05,2000-01-07)}','{[2000-01-01,2000-01-02),[2000-01-05,2000-01-07)}','{[2000-01-01 00:00+00,2000-01-02 00:00+00),[2000-01-05 00:00+00,2000-01-07 00:00+00)}',1,9007199254740993,9.1000,'2000-01-01','2000-01-07','2000-01-01 00:00+00',false,true,false,false,false);

-- name: shift_segments_merged
INSERT INTO lane_shift_segments(slots,slot_floor,expected_empty,expected_bounded,expected_missing,bypass)
VALUES('{empty,[2,4),[1,3),[1,3)}',1,false,true,false,false);

-- name: shift_segments_unbounded
INSERT INTO lane_shift_segments(slots,loads,prices,calendar_days,local_shift,instant_shift,expected_empty,expected_bounded,expected_missing,bypass)
VALUES('{(,)}','{(,)}','{(,)}','{(,)}','{(,)}','{(,)}',false,false,false,false);

-- name: shift_segments_infinities
INSERT INTO lane_shift_segments(prices,calendar_days,local_shift,instant_shift,price_ceiling,day_floor,local_ceiling,instant_floor,bypass)
VALUES('{[NaN,NaN]}','{[-infinity,infinity]}','{[-infinity,infinity]}','{[-infinity,infinity]}','NaN','-infinity','infinity','-infinity',false);

-- name: shift_segments_alternate
INSERT INTO lane_shift_segments(loads,alternate_loads,load_floor,choose_alternate,bypass)
VALUES('{[5,9)}','{[5,6),[10,12)}',5,true,false);

-- name: shift_segments_slot_mismatch
INSERT INTO lane_shift_segments(slots,slot_floor,bypass) VALUES('{[1,3)}',2,false);

-- name: shift_segments_load_mismatch
INSERT INTO lane_shift_segments(loads,load_floor,bypass) VALUES('{[1,3)}',2,false);

-- name: shift_segments_price_mismatch
INSERT INTO lane_shift_segments(prices,price_ceiling,bypass) VALUES('{[1,3],[7,9]}',3,false);

-- name: shift_segments_day_mismatch
INSERT INTO lane_shift_segments(calendar_days,day_floor,bypass) VALUES('{[2000-01-01,2000-01-03)}','2000-01-02',false);

-- name: shift_segments_local_mismatch
INSERT INTO lane_shift_segments(local_shift,local_ceiling,bypass) VALUES('{[2000-01-01,2000-01-03)}','2000-01-02',false);

-- name: shift_segments_instant_mismatch
INSERT INTO lane_shift_segments(instant_shift,instant_floor,bypass) VALUES('{[2000-01-01 00:00+00,2000-01-03 00:00+00)}','2000-01-02 00:00+00',false);

-- name: shift_segments_empty_mismatch
INSERT INTO lane_shift_segments(slots,expected_empty,bypass) VALUES('{}',false,false);

-- name: shift_segments_bounded_mismatch
INSERT INTO lane_shift_segments(slots,slot_floor,expected_bounded,bypass) VALUES('{[1,3)}',1,false,false);

-- name: shift_segments_present_mismatch
INSERT INTO lane_shift_segments(expected_missing,bypass) VALUES(false,false);

-- name: shift_segments_choice_mismatch
INSERT INTO lane_shift_segments(loads,alternate_loads,load_floor,choose_alternate,bypass) VALUES('{[1,3)}','{[5,7)}',1,true,false);

-- name: shift_segments_bypass
INSERT INTO lane_shift_segments(slots,loads,slot_floor,load_floor,expected_empty,expected_bounded,expected_missing,bypass)
VALUES('{}','{[1,3)}',99,99,false,true,true,true);

-- name: segment_assembly_null
INSERT INTO lane_segment_assembly(expected_zero_empty,bypass) VALUES(true,false);

-- name: segment_assembly_empty
INSERT INTO lane_segment_assembly(first_slot,second_slot,slot_parts,load_parts,price_parts,day_parts,local_parts,instant_parts,expected_zero_empty,bypass)
VALUES('empty','empty','{}','{}','{}','{}','{}','{}',true,false);

-- name: segment_assembly_parts
INSERT INTO lane_segment_assembly(first_slot,second_slot,slot_parts,load_parts,price_parts,day_parts,local_parts,instant_parts,slot_floor,slot_ceiling,load_ceiling,price_floor,day_ceiling,local_floor,instant_ceiling,chosen_floor,chosen_ceiling,choose_parts,expected_zero_empty,bypass)
VALUES('[7,9)','[1,3)','{"[7,9)","[1,3)","[3,7)"}','{"[9007199254740997,9007199254740999)","[9007199254740993,9007199254740995)"}','{"[1.2300,3.0000]","[1.230000,3.0]","[7,9]"}','{"[2000-01-05,2000-01-07)","[2000-01-01,2000-01-03)"}','{"[2000-01-05,2000-01-07)","[2000-01-01,2000-01-03)"}','{"[2000-01-05 00:00+00,2000-01-07 00:00+00)","[2000-01-01 00:00+00,2000-01-03 00:00+00)"}',1,9,9007199254740999,1.23,'2000-01-07','2000-01-01','2000-01-07 00:00+00',1,9,true,true,false);

-- name: segment_assembly_lower_bound
INSERT INTO lane_segment_assembly(slot_parts,slot_ceiling,chosen_floor,chosen_ceiling,choose_parts,expected_zero_empty,bypass)
VALUES('[-2:0]={"[7,9)","[1,3)",empty}',9,1,9,true,true,false);

-- name: segment_assembly_unbounded
INSERT INTO lane_segment_assembly(first_slot,second_slot,slot_parts,load_parts,price_parts,day_parts,local_parts,instant_parts,expected_zero_empty,bypass)
VALUES('(,)','empty','{"(,)",empty}','{"(,)"}','{"(,)"}','{"(,)"}','{"(,)"}','{"(,)"}',true,false);

-- name: segment_assembly_infinities
INSERT INTO lane_segment_assembly(price_parts,day_parts,local_parts,instant_parts,price_floor,day_ceiling,local_floor,instant_ceiling,expected_zero_empty,bypass)
VALUES('{"[NaN,NaN]"}','{"[-infinity,infinity]"}','{"[-infinity,infinity]"}','{"[-infinity,infinity]"}','NaN','infinity','-infinity','infinity',true,false);

-- name: segment_assembly_pair_mismatch
INSERT INTO lane_segment_assembly(first_slot,second_slot,slot_floor,chosen_floor,chosen_ceiling,bypass)
VALUES('[7,9)','[1,3)',7,7,9,false);

-- name: segment_assembly_slot_mismatch
INSERT INTO lane_segment_assembly(slot_parts,slot_ceiling,chosen_ceiling,bypass)
VALUES('{"[1,3)"}',9,3,false);

-- name: segment_assembly_load_mismatch
INSERT INTO lane_segment_assembly(load_parts,load_ceiling,bypass) VALUES('{"[1,3)"}',9,false);

-- name: segment_assembly_price_mismatch
INSERT INTO lane_segment_assembly(price_parts,price_floor,bypass) VALUES('{"[1,3]"}',9,false);

-- name: segment_assembly_day_mismatch
INSERT INTO lane_segment_assembly(day_parts,day_ceiling,bypass) VALUES('{"[2000-01-01,2000-01-03)"}','2000-01-02',false);

-- name: segment_assembly_local_mismatch
INSERT INTO lane_segment_assembly(local_parts,local_floor,bypass) VALUES('{"[2000-01-01,2000-01-03)"}','2000-01-02',false);

-- name: segment_assembly_instant_mismatch
INSERT INTO lane_segment_assembly(instant_parts,instant_ceiling,bypass) VALUES('{"[2000-01-01 00:00+00,2000-01-03 00:00+00)"}','2000-01-02 00:00+00',false);

-- name: segment_assembly_case_mismatch
INSERT INTO lane_segment_assembly(first_slot,chosen_floor,chosen_ceiling,choose_parts,bypass) VALUES('[1,3)',9,3,false,false);

-- name: segment_assembly_coalesce_mismatch
INSERT INTO lane_segment_assembly(first_slot,chosen_floor,chosen_ceiling,bypass) VALUES('[1,3)',1,9,false);

-- name: segment_assembly_zero_mismatch
INSERT INTO lane_segment_assembly(expected_zero_empty,bypass) VALUES(false,false);

-- name: segment_assembly_null_member
INSERT INTO lane_segment_assembly(first_slot,slot_parts,chosen_floor,chosen_ceiling,choose_parts,bypass)
VALUES('[1,3)','{NULL}',1,3,false,false);

-- name: segment_assembly_dimensions
INSERT INTO lane_segment_assembly(first_slot,slot_parts,chosen_floor,chosen_ceiling,choose_parts,bypass)
VALUES('[1,3)','{{"[1,3)"},{"[5,7)"}}',1,3,false,false);

-- name: segment_assembly_dimensions_before_null
INSERT INTO lane_segment_assembly(slot_parts,choose_parts,bypass) VALUES('{{NULL},{"[1,3)"}}',true,false);

-- name: segment_assembly_bypass
INSERT INTO lane_segment_assembly(first_slot,second_slot,slot_parts,slot_floor,slot_ceiling,chosen_floor,chosen_ceiling,expected_zero_empty,choose_parts,bypass)
VALUES('empty','empty','{{NULL},{"[1,3)"}}',99,99,99,99,false,true,true);

-- name: segment_compatibility_null
INSERT INTO lane_segment_compatibility(bypass) VALUES(false);

-- name: segment_compatibility_empty
INSERT INTO lane_segment_compatibility(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,preferred,expected_order,expected_contains,expected_overlap,expected_adjacent,require_bounded,bypass)
VALUES('{}','{}','{}','{}','{}','{}','{}','{}','{}','{}','{}','{}','{}',0,true,false,false,true,false);

-- name: segment_compatibility_equal
INSERT INTO lane_segment_compatibility(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,reserved_span,checkpoint,alternatives,preferred,expected_order,expected_contains,expected_overlap,expected_adjacent,expected_span,expected_checkpoint,expected_alternative,require_bounded,bypass)
VALUES('{[1,3),[5,7)}','{[1,3),[5,7)}','{[9007199254740993,9007199254740995)}','{[9007199254740993,9007199254740995)}','{[1.2300,3.00]}','{[1.23,3.0000]}','{[2000-01-01,2000-01-03)}','{[2000-01-01,2000-01-03)}','{[2000-01-01,2000-01-03)}','{[2000-01-01,2000-01-03)}','{[2000-01-01 00:00+00,2000-01-03 00:00+00)}','{[2000-01-01 00:00+00,2000-01-03 00:00+00)}','[1,2)',5,'{"[3,5)","[5,6)"}','{[1,3),[5,7)}',0,true,true,false,true,true,true,true,false);

-- name: segment_compatibility_adjacent
INSERT INTO lane_segment_compatibility(slots,other_slots,loads,other_loads,prices,other_prices,calendar_days,other_days,local_shift,other_local,instant_shift,other_instant,reserved_span,checkpoint,alternatives,preferred,expected_order,expected_contains,expected_overlap,expected_adjacent,expected_span,expected_checkpoint,expected_alternative,bypass)
VALUES('{[1,3)}','{[3,5)}','{[1,3)}','{[3,5)}','{[1,3)}','{[3,5)}','{[2000-01-01,2000-01-03)}','{[2000-01-03,2000-01-05)}','{[2000-01-01,2000-01-03)}','{[2000-01-03,2000-01-05)}','{[2000-01-01 00:00+00,2000-01-03 00:00+00)}','{[2000-01-03 00:00+00,2000-01-05 00:00+00)}','[3,5)',3,'{"[3,5)"}','{[3,5)}',-1,false,false,true,false,false,false,false);

-- name: segment_compatibility_gap
INSERT INTO lane_segment_compatibility(slots,reserved_span,checkpoint,alternatives,preferred,expected_span,expected_checkpoint,expected_alternative,require_bounded,bypass)
VALUES('{[1,3),[5,7)}','[2,6)',4,'{"[3,5)",empty}','{[1,3),[5,7)}',false,false,true,true,false);

-- name: segment_compatibility_empty_alternatives
INSERT INTO lane_segment_compatibility(slots,alternatives,expected_alternative,bypass)
VALUES('{}','{}',false,false);

-- name: segment_compatibility_order_mismatch
INSERT INTO lane_segment_compatibility(expected_order,bypass) VALUES(0,false);

-- name: segment_compatibility_contains_mismatch
INSERT INTO lane_segment_compatibility(expected_contains,bypass) VALUES(false,false);

-- name: segment_compatibility_overlap_mismatch
INSERT INTO lane_segment_compatibility(expected_overlap,bypass) VALUES(false,false);

-- name: segment_compatibility_adjacent_mismatch
INSERT INTO lane_segment_compatibility(expected_adjacent,bypass) VALUES(false,false);

-- name: segment_compatibility_span_mismatch
INSERT INTO lane_segment_compatibility(slots,reserved_span,expected_span,bypass)
VALUES('{[1,3),[5,7)}','[2,6)',true,false);

-- name: segment_compatibility_checkpoint_mismatch
INSERT INTO lane_segment_compatibility(slots,checkpoint,expected_checkpoint,bypass)
VALUES('{[1,3),[5,7)}',4,true,false);

-- name: segment_compatibility_choice_mismatch
INSERT INTO lane_segment_compatibility(slots,preferred,bypass) VALUES('{[1,3)}','{}',false);

-- name: segment_compatibility_alternative_mismatch
INSERT INTO lane_segment_compatibility(slots,alternatives,expected_alternative,bypass)
VALUES('{[1,3)}','{"[3,5)"}',true,false);

-- name: segment_compatibility_unbounded_error
INSERT INTO lane_segment_compatibility(slots,require_bounded,bypass) VALUES('{(,)}',true,false);

-- name: segment_compatibility_bounded_null
INSERT INTO lane_segment_compatibility(require_bounded,bypass) VALUES(true,false);

-- name: segment_compatibility_bypass
INSERT INTO lane_segment_compatibility(slots,other_slots,expected_order,expected_contains,expected_overlap,expected_adjacent,preferred,require_bounded,bypass)
VALUES('{(,)}','{}',99,false,true,true,'{[1,3)}',true,true);
