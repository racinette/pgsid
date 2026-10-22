-- name: ExportLayout
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

-- name: EmptyLayout
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('','',ROW(''::int2vector,''::oidvector),ARRAY[''::int2vector],'',0,'{"type_ids": [], "positions": []}',false);

-- name: NullLayout
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES (NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: NullLayoutFields
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES (NULL,NULL,ROW(NULL::int2vector,NULL::oidvector),ARRAY[NULL::int2vector],NULL,NULL,'{"type_ids": null, "positions": null}',false);

-- name: ConstructedTypeIds
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2',ARRAY[0,0]::oidvector,ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

-- name: UnsignedTypeIds
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('3 4','4294967295 2147483648',ROW('3 4'::int2vector,'4294967295 2147483648'::oidvector),ARRAY['3 4'::int2vector],'3 4',2,'{"type_ids": ["4294967295", "2147483648"], "positions": [3, 4]}',false);

-- name: WrongPositionCount
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',3,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

-- name: WrongTypeCount
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('3 4','0',ROW('3 4'::int2vector,'0'::oidvector),ARRAY['3 4'::int2vector],'3 4',2,'{"type_ids": ["0"], "positions": [3, 4]}',false);

-- name: WrongPacketPositions
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 3'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "0"], "positions": [1, 3]}',false);

-- name: WrongPacketTypes
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 1'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "1"], "positions": [1, 2]}',false);

-- name: WrongHistoryPositions
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['2 1'::int2vector],'1 2',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

-- name: WrongDecodedPositions
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'2 1',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

-- name: WrongJsonPacket
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{}',false);

-- name: NegativePositions
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('-1 2','0 0',ROW('-1 2'::int2vector,'0 0'::oidvector),ARRAY['-1 2'::int2vector],'-1 2',2,'{"type_ids": ["0", "0"], "positions": [-1, 2]}',false);

-- name: LiteralPositionsAreNotConstructedTemplate
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 1',ROW('1 2'::int2vector,'0 1'::oidvector),ARRAY['1 2'::int2vector],'1 2',2,'{"type_ids": ["0", "1"], "positions": [1, 2]}',false);

-- name: WrongConstructedTemplateTypes
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES (ARRAY[1,2]::int2vector,'0 1',ROW(ARRAY[1,2]::int2vector,'0 1'::oidvector),ARRAY[ARRAY[1,2]::int2vector],'1 2',2,'{"type_ids": ["0", "1"], "positions": [1, 2]}',false);

-- name: InvalidEncodedPositions
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 0',ROW('1 2'::int2vector,'0 0'::oidvector),ARRAY['1 2'::int2vector],'not_positions',2,'{"type_ids": ["0", "0"], "positions": [1, 2]}',false);

-- name: BypassedInvalidEncoding
INSERT INTO catalog_layout_exports(positions,type_ids,packet,history,encoded_positions,expected_count,expected_json,bypass)
VALUES ('1 2','0 1',ROW('1 2'::int2vector,'0 1'::oidvector),ARRAY['1 2'::int2vector],'not_positions',3,'{}',true);
