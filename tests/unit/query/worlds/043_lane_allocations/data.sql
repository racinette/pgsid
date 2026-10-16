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
