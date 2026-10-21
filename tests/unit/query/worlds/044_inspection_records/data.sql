INSERT INTO inspection_reports VALUES (NULL, NULL, true, false, true, false);
INSERT INTO inspection_drafts VALUES (2, 'approved', 1, 1, false, false, false);
INSERT INTO stored_inspections VALUES (ROW(2,'abc')::approved_draft,false,true,false);
INSERT INTO inspection_imports VALUES ('(2,abc)', '(2,abc)', 2, false, true, false);
INSERT INTO inspection_comparisons VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 0, true, false, false, true, false);
INSERT INTO inspection_batches VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 1, true, 0, false);
