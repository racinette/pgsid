INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

INSERT INTO catalog_extent_exports(positions,type_groups,packet,needle,expected_contains,encoded_positions,position_text,type_text,expected_lower,expected_wire,bypass)
VALUES ('[1,3)','{[100,"1 2")}',ROW('[1,3)'::position_window,'{[100,"1 2")}'::type_windows),'100',true,'[1,3)','[1,3)','{[100,"1 2")}',0,61,false);
