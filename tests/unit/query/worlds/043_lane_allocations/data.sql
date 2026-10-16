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
