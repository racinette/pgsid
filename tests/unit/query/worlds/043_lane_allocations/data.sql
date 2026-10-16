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
