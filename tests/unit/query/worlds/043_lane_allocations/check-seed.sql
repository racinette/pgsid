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

-- name: jsonb_enum_requires_catalog
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
