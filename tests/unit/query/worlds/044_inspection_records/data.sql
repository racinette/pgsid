INSERT INTO inspection_reports VALUES (NULL, NULL, true, false, true, false);
INSERT INTO inspection_drafts VALUES (2, 'approved', 1, 1, false, false, false);
INSERT INTO stored_inspections VALUES (ROW(2,'abc')::approved_draft,false,true,false);
INSERT INTO inspection_imports VALUES ('(2,abc)', '(2,abc)', 2, false, true, false);
INSERT INTO inspection_comparisons VALUES (ROW(2,'ok','[1,3)'::int4range)::inspection_reading, ROW(2,'ok','[1,3)'::int4range)::inspection_reading, 0, true, false, false, true, false);
INSERT INTO inspection_batches VALUES (ARRAY[ROW(2,'abc')::draft_reading], ARRAY[ROW(2,'abc')::draft_reading], '{"(2,abc)"}', '{"(2,abc)"}', 1, true, 0, false);
INSERT INTO inspection_approved_batches VALUES (ARRAY[ROW(2,'abc')::approved_draft], '{"(2,abc)"}', '{"(2,abc)"}', 1, 0, false);
INSERT INTO inspection_nested_batches VALUES (ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch], ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, ARRAY[ARRAY[ROW(2,'abc')::approved_draft]::inspection_batch]::text, 1, 0, false);
INSERT INTO inspection_bands VALUES ('["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")','["(2,abc)","(4,xyz)")',2,0,true,false);
INSERT INTO inspection_documents VALUES (NULL,NULL,NULL,false,false);
INSERT INTO inspection_projections VALUES (NULL,NULL,'{"f1":null,"f2":null}',true,false);

INSERT INTO inspection_typed_readings(score,label,approved,bypass) VALUES (3,'ok',true,false);
INSERT INTO inspection_typed_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW(3,'ok',true,false)::inspection_typed_readings,NULL,1,'[{"score":3,"label":"ok","approved":true,"bypass":false},null]',false);

INSERT INTO inspection_import_batches(reading,fallback,minimum_score,expected_batch,bypass) VALUES (ROW('3','ok','true','false')::inspection_import_fields,NULL,1,'[{"score":3,"label":"ok","approved":true,"bypass":false},null]',false);
INSERT INTO inspection_record_rechecks(reading,minimum_score,expected_empty,bypass) VALUES (NULL,1,true,false);

INSERT INTO inspection_mixed_conversions(reading,fallback,minimum_score,expected_document,use_text,bypass) VALUES (ROW(9,'ok',3,true)::inspection_extensions,NULL,1,'{"score":3,"label":"ok"}',false,false);
INSERT INTO inspection_duration_labels(elapsed,label_pattern,expected_label,bypass) VALUES ('25:02:03.123456','HH24:MI:SS.US','25:02:03.123456',false);
