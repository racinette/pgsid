INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);
