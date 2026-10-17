INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:2]={10,NULL,30}'::integer[], NULL, 1, 3, 1, 0, 2, '[0:2]', false);
INSERT INTO lane_batches (first_batch, second_batch, expected_layout, slot_limit)
VALUES ('[0:1]={1,NULL}'::integer[], '[0:1]={3,4}'::integer[], '[1:2][0:1]', 4);
INSERT INTO lane_candidates (first_lane, second_lane, divisor, expected_count, expected_layout, bypass)
VALUES (1, NULL, 1, 3, '[1:2][1:2]', false);

INSERT INTO lane_imports (payload, labels, flags, amounts, documents, regions, slot_limit, expected_layout, bypass)
VALUES ('{1,2}', '{a,b}', '{yes,no}', '{1.25,2.5}', '{"{\"a\":1}"}', '{(1,1),(0,0)}', 3, '[1:2]', false);

INSERT INTO lane_exports (slots, labels, flags, amounts, documents, expected_slots, expected_labels, expected_flags, expected_amounts, expected_documents, bypass)
VALUES ('[0:1]={1,NULL}', ARRAY['NULL','a,b'], ARRAY[true,false,NULL], ARRAY[1.2300::numeric,NULL], ARRAY['{"a":1}'::jsonb,NULL], '[0:1]={1,NULL}', '{"NULL","a,b"}', '{t,f,NULL}', '{1.2300,NULL}', '{"{\"a\": 1}",NULL}', false);

INSERT INTO lane_selections (slots, slot_index, lane_index, slice_low, slice_high, expected_slot, expected_lane_slot, expected_slice, divisor, bypass)
VALUES ('[0:2]={10,NULL,30}', 0, 0, 0, 1, 10, NULL, '{10,NULL}', 1, false);

INSERT INTO lane_comparisons (first_slots, second_slots, expected_equal, expected_order, first_labels, second_labels, expected_label_order, minimum_amount, require_order, expected_member)
VALUES ('{1,NULL}', '{1,NULL}', true, 0, '{a}', '{z}', -1, '1', true, true);

INSERT INTO lane_document_comparisons (first_payload, second_payload, bypass)
VALUES ('{}', '{NULL}', false);

INSERT INTO lane_requirements (selected_slots, approved_slots, required_slots, forbidden_slots, bypass)
VALUES ('[0:1]={1,2}', '{{1,2,3}}', '{1,1}', '{4,NULL}', false);

INSERT INTO lane_document_membership (first_payload, second_payload, bypass)
VALUES ('bad', 'bad', true);

INSERT INTO lane_promotions (small_slots, big_slots, narrow_slots, expected_fallback, expected_selected, expected_narrow, expected_layout, use_small, bypass)
VALUES ('{1,2}', '{3,4}', '{1,2}', '{1,2}', '{3,4}', '{1,2}', '[1:2][1:2]', false, false);

INSERT INTO lane_stage_arrays (first_stages, second_stages, expected_stages, require_order)
VALUES ('{new}', '{new,done}', '{new}', true);

INSERT INTO lane_searches (slots, needle, start_slot, expected_first, expected_from_start, expected_positions, require_match)
VALUES ('[0:3]={1,NULL,1,2}', 1, 1, 0, 2, '{0,2}', true);

INSERT INTO lane_stage_searches (stages, needle, expected_first, expected_positions)
VALUES ('[0:2]={new,done,new}', 'new', 0, '{0,2}');

INSERT INTO lane_document_searches (payload, needle, start_slot, bypass)
VALUES ('{}', '{NULL}', NULL, false);

INSERT INTO lane_extensions (slots, needle, expected_append, expected_prepend, bypass)
VALUES ('[0:1]={1,NULL}', 2, '[0:2]={1,NULL,2}', '[0:2]={2,1,NULL}', false);

INSERT INTO lane_joined_batches (first_slots, second_slots, expected_slots, expected_layout)
VALUES ('[0:1]={1,2}', '[5:6][0:1]={{3,4},{5,6}}', '[5:7][0:1]={{1,2},{3,4},{5,6}}', '[5:7][0:1]');

INSERT INTO lane_stage_extensions (stages, needle, extra_stages, expected_append, expected_prepend, expected_join)
VALUES ('{new}', 'done', '{done}', '{new,done}', '{done,new}', '{new,done}');

INSERT INTO lane_document_extensions (payload, extra_payload, expected_payload, bypass)
VALUES ('{1}', '{"null",NULL}', '{1,"null",NULL}', false);

INSERT INTO lane_revisions (slots, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('[0:3]={1,NULL,1,2}', 1, 9007199254740993, '[0:1]={NULL,2}', '[0:3]={9007199254740993,NULL,9007199254740993,2}', false);

INSERT INTO lane_stage_revisions (stages, needle, replacement, expected_remove, expected_replace)
VALUES ('{new,NULL,new,done}', 'new', 'done', '{NULL,done}', '{done,NULL,done,done}');

INSERT INTO lane_document_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{}', '{1}', '{2}', '{}', '{}', false);

INSERT INTO lane_jsonb_revisions (payload, needle, replacement, expected_remove, expected_replace, bypass)
VALUES ('{1.0,1,2}', '{1}', '{0}', '{2}', '{0,0,2}', false);

INSERT INTO lane_templates (seed, dimensions, lower_bounds, expected_default, expected_bounded, bypass)
VALUES (7, '{2,2}', '{0,-2}', '{{7,7},{7,7}}', '[0:1][-2:-1]={{7,7},{7,7}}', false);

INSERT INTO lane_truncations (slots, trim_count, expected_slots)
VALUES ('[0:1][2:3]={{1,2},{3,4}}', 1, '{{1,2}}');

INSERT INTO lane_stage_templates (seed, dimensions, lower_bounds, expected_fill, stages, trim_count, expected_trim)
VALUES ('done', '{2}', '{0}', '[0:1]={done,done}', '[3:4]={new,done}', 1, '{new}');

INSERT INTO lane_document_templates (seed, dimensions, expected_count, expected_layout, expected_cell)
VALUES ('{"a":[1]}'::jsonb, '{2,2}', 4, '[1:2][1:2]', '{"a":[1]}'::jsonb);

INSERT INTO lane_text_imports (payload, separator, null_marker, expected_array, expected_join, expected_count)
VALUES ('a,,NULL,', ',', 'NULL', '{a,"",NULL,""}', 'a,,NULL,', 4);

INSERT INTO lane_string_exports (slots, separator, null_marker, expected_skip, expected_marked)
VALUES ('[0:1][2:3]={{1,NULL},{2,3}}', '|', 'missing', '1|2|3', '1|missing|2|3');

INSERT INTO lane_stage_exports (stages, separator, null_marker, expected_text)
VALUES ('[0:2]={new,NULL,done}', '|', 'missing', 'new|missing|done');

INSERT INTO lane_document_exports (payload, separator, null_marker, expected_text, bypass)
VALUES ('{1.0,"null",NULL}', '|', 'missing', '1.0|null|missing', false);

INSERT INTO lane_reversals (slots, expected_slots, bypass)
VALUES ('[0:1][2:3]={{1,NULL},{2,3}}', '[0:1][2:3]={{2,3},{1,NULL}}', false);

INSERT INTO lane_stage_reversals (stages, expected_stages)
VALUES ('[0:2]={new,NULL,done}', '[0:2]={done,NULL,new}');

INSERT INTO lane_document_reversals (payload, expected_payload, bypass)
VALUES ('{1,"null",NULL}', '{NULL,"null",1}', false);

INSERT INTO lane_binary_exports (stages, bypass)
VALUES (NULL, true);

INSERT INTO lane_sorted_slots (slots, descending, nulls_first, expected_default, expected_order, expected_flags)
VALUES ('[0:3]={2,NULL,0,1}', true, false, '[0:3]={0,1,2,NULL}', '[0:3]={NULL,2,1,0}', '[0:3]={2,1,0,NULL}');

INSERT INTO lane_sorted_stages (stages, expected_stages)
VALUES ('{done,NULL,new}', '{new,done,NULL}');

INSERT INTO lane_sorted_documents (payload, expected_payload)
VALUES ('{2,1,NULL}', '{1,2,NULL}');

INSERT INTO lane_unsortable_documents (payload, bypass)
VALUES ('{}', false);

INSERT INTO lane_sorted_precision (payload, expected_text, expected_count, expected_first, bypass)
VALUES ('{1.00,0,1.00}', '{0,1.00,1.00}', 3, '0', false);

INSERT INTO lane_document_paths (document, binary_document, path, expected_json, expected_text, expected_binary, expected_binary_text)
VALUES ('{"a":[{"id":7},{"id":8}]}', '{"a":[{"id":7},{"id":8}]}', '{a,-1,id}', '8', '8', '8', '8');

INSERT INTO lane_expanded_paths (document, binary_document, first_key, second_key, expected_text, expected_binary_text)
VALUES ('{"a":{"x":1}}', '{"a":{"x":1}}', 'a', 'x', '1', '1');

INSERT INTO lane_document_keys (document, keys, expected_any, expected_all, bypass)
VALUES ('{"a":1,"b":null}', '{a,b}', true, true, false);

INSERT INTO lane_jsonb_arrays (slots, labels, documents, amounts, expected_slots, expected_labels, expected_documents, expected_amounts, expected_flattened, expected_object, expected_nested, expected_named, bypass)
VALUES ('{1,NULL,2,3}', '{a,1,b,2}', '{1,"null"}', '{1.00,2.5}', '[1,null,2,3]', '["a","1","b","2"]', '[1,null]', '[1.00,2.5]', '[1,null,2,3]', '{"a":"1","b":"2"}', '[[1,null,2,3],null]', '{"slots":[1,null,2,3]}', false);

INSERT INTO lane_jsonb_imports (payload, expected_nested, expected_flattened, divisor, bypass)
VALUES ('{1,"null",2}', '[1,null,2]', '[1,null,2]', 1, false);

INSERT INTO lane_jsonb_stage_arrays (stages, expected, bypass)
VALUES ('{}', '[]', false);

INSERT INTO lane_document_edits (document, path, replacement, create_missing, insert_after, run_insert, expected_delete, expected_set, expected_insert, bypass)
VALUES ('[1,2,3]', '{1}', '9', false, false, true, '[1,3]', '[1,9,3]', '[1,9,2,3]', false);

INSERT INTO lane_document_null_edits (document, path, replacement, create_missing, policy, expected_policy, expected_default, run_default, bypass)
VALUES ('{"a":1}', '{a}', NULL, true, 'use_json_null', '{"a":null}', '{"a":null}', true, false);

INSERT INTO lane_document_edit_imports (document, path, replacement, create_missing, policy, expected, bypass)
VALUES ('{"a":1}', '{a}', '9', true, 'use_json_null', '{"a":9}', false);

INSERT INTO lane_document_key_removals (document, keys, first_key, second_key, expected_bulk, expected_expanded, expected_scalar, bypass)
VALUES ('{"a":1,"b":2,"nested":{"a":3}}', '{a,b}', 'a', 'b', '{"nested":{"a":3}}', '{"nested":{"a":3}}', '{"b":2,"nested":{"a":3}}', false);

INSERT INTO lane_object_arrays (pairs, keys, contents, expected_pairs, expected_separate, expected_binary_pairs, expected_binary_separate, bypass)
VALUES ('{a,1,b,2}', '{a,b}', '{1,2}', '{"a" : "1", "b" : "2"}', '{"a" : "1", "b" : "2"}', '{"a":"1","b":"2"}', '{"a":"1","b":"2"}', false);

INSERT INTO lane_object_imports (payload, expected, expected_binary, bypass)
VALUES ('{a,1}', '{"a" : "1"}', '{"a":"1"}', false);

INSERT INTO lane_stripped_documents (document, strip_arrays, run_default, expected_default, expected_explicit, expected_composed, bypass)
VALUES ('{"a":null,"b":1}', false, true, '{"b":1}', '{"b":1}', '{"b":1}', false);

INSERT INTO lane_strip_imports (payload, strip_arrays, expected, bypass)
VALUES (' { "a" : null, "b" : [null,1] } ', true, '{"b":[1]}', false);

INSERT INTO lane_encoded_documents (document, payload, divisor, expected, expected_array, expected_eager, bypass)
VALUES ('"\u00e9"', '"\u00e9"', 1, '"é"', '["é"]', '["é",1]', false);

INSERT INTO lane_json_conversion_arrays (slots, documents, binary_documents, amounts, labels, pretty, expected_slots, expected_pretty, expected_documents, expected_binary, expected_amounts, expected_labels, bypass)
VALUES ('[-1:1]={1,NULL,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '{"{\"é\":1,\"aa\":2,\"a\":3}","null",NULL}', '{1.2300,-0.000,NaN,Infinity}', '{"a","雪😊",NULL}', true, '[1,null,2]', '[1,
 null,
 2]', '[ { "a":1,"a":2 } ,"\u0000",1e999999,null]', '[{"a": 3, "aa": 2, "é": 1},null,null]', '[1.2300,0.000,"NaN","Infinity"]', '["a",
 "雪😊",
 null]', false);

INSERT INTO lane_json_conversion_scalars (document, binary_document, amount, label, flag, clock, expected_document, expected_binary, expected_amount, expected_label, expected_flag, expected_clock, bypass)
VALUES (' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', '1.2300', '雪😊', true, '12:34:56.123456', ' { "a":1,"a":2 } ', '{"a": 3, "aa": 2, "é": 1}', '1.2300', '"雪😊"', 'true', '"12:34:56.123456"', false);

INSERT INTO lane_json_conversion_imports (payload, pretty, expected, bypass)
VALUES ('{" { \"a\":1,\"a\":2 } ",NULL}', true, '[ { "a":1,"a":2 } ,
 null]', false);

INSERT INTO lane_raw_document_builders (label, amount, flag, document, binary_document, first_key, second_key, run_keys, expected_array, expected_object, expected_duplicate, expected_keys, expected_empty_array, expected_empty_object, bypass)
VALUES ('雪😊', '1.2300', true, ' { "a":1,"a":2 } ', '{"é":1,"aa":2,"a":3}', 'a', 'a', true, '["雪😊", 1.2300, true,  { "a":1,"a":2 } , {"a": 3, "aa": 2, "é": 1}, null]', '{"label" : "雪😊", "number" : 1.2300, "flag" : true, "document" :  { "a":1,"a":2 } , "binary" : {"a": 3, "aa": 2, "é": 1}}', '{"a" : 1, "a" : 2}', '{"true" :  { "a":1,"a":2 } , "1.2300" : "雪😊"}', '[]', '{}', false);

INSERT INTO lane_raw_array_builders (slots, labels, documents, expected_nested, expected_flattened, expected_object, expected_documents, bypass)
VALUES ('[0:2]={1,NULL,2}', '{a,1,a,2}', '{" { \"a\":1,\"a\":2 } ","\"\\u0000\"","1e999999",NULL}', '[[1,null,2], null]', '[1, null, 2]', '{"a" : "1", "a" : "2"}', '[ { "a":1,"a":2 } , "\u0000", 1e999999, null]', false);

INSERT INTO lane_raw_builder_imports (payload, divisor, expected_array, expected_object, bypass)
VALUES ('{"\"\\u0000\"",NULL}', 1, '[["\u0000",null], 1]', '{"values" : ["\u0000",null], "count" : 1}', false);

INSERT INTO lane_numeric_imports (payload, alternate, expected_text, expected_array, expected_binary, expected_rounded, expected_raw, bypass)
VALUES ('+1.2300', '2.500', '1.2300', '[1.2300,2.500,null]', '[1.23,2.5,null]', '1.23', '[1.2300, 2.500, null]', false);
