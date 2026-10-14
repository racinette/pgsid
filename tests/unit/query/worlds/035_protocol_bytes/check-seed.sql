-- name: protocol_zero
INSERT INTO protocol_bytes(id,label,code,wire,signed_value,rendered,reference,recorded_order) VALUES (101,'protocol_zero','','\x00',0,'','\000',0);
-- name: protocol_ascii
INSERT INTO protocol_bytes(id,label,code,wire,signed_value,rendered,reference,recorded_order) VALUES (101,'protocol_ascii','A','\x41',65,'A','\000',65);
-- name: protocol_high
INSERT INTO protocol_bytes(id,label,code,wire,signed_value,rendered,reference,recorded_order) VALUES (101,'protocol_high','\200','\x80',-128,'\200','\000',128);
-- name: protocol_last
INSERT INTO protocol_bytes(id,label,code,wire,signed_value,rendered,reference,recorded_order) VALUES (101,'protocol_last','\377','\xff',-1,'\377','\000',255);
-- name: protocol_utf8
INSERT INTO protocol_bytes(id,label,code,wire,signed_value,rendered,reference,recorded_order) VALUES (101,'protocol_utf8','é','\xc3',-61,'\303','\000',195);
-- name: protocol_wrong_wire
INSERT INTO protocol_bytes(id,label,code,wire) VALUES (101,'protocol_wrong_wire','\377','\x00');
-- name: protocol_wrong_signed
INSERT INTO protocol_bytes(id,label,code,signed_value) VALUES (101,'protocol_wrong_signed','\200',128);
-- name: protocol_wrong_text
INSERT INTO protocol_bytes(id,label,code,rendered) VALUES (101,'protocol_wrong_text','é','é');
-- name: protocol_wrong_order
INSERT INTO protocol_bytes(id,label,code,reference,recorded_order) VALUES (101,'protocol_wrong_order','\377','\000',1);
-- name: protocol_null
INSERT INTO protocol_bytes(id,label,code,wire,signed_value,rendered,reference,recorded_order) VALUES (101,'protocol_null',NULL,NULL,NULL,NULL,NULL,NULL);
-- name: selection_high
INSERT INTO byte_selections(id,label,protocol_id,code,alternative,use_code,selected,smallest,largest,different,unequal_wire) VALUES (101,'selection_high',1,'\377','A',true,'\377','A','\377',true,'\xff');
-- name: selection_equal
INSERT INTO byte_selections(id,label,protocol_id,code,alternative,use_code,selected,smallest,largest,different,unequal_wire) VALUES (101,'selection_equal',1,'A','A',false,'A','A','A',false,'\x00');
-- name: selection_null
INSERT INTO byte_selections(id,label,protocol_id,code,alternative,use_code,selected,smallest,largest,different,unequal_wire) VALUES (101,'selection_null',1,NULL,NULL,true,NULL,NULL,NULL,false,NULL);
-- name: selection_null_fallback
INSERT INTO byte_selections(id,label,protocol_id,code,alternative,use_code,selected,smallest,largest,different) VALUES (101,'selection_null_fallback',1,NULL,'\377',false,'\377','\377','\377',true);
-- name: selection_wrong_branch
INSERT INTO byte_selections(id,label,protocol_id,use_code,code,alternative,selected) VALUES (101,'selection_wrong_branch',1,true,'A','B','B');
-- name: selection_wrong_smallest
INSERT INTO byte_selections(id,label,protocol_id,use_code,code,alternative,smallest) VALUES (101,'selection_wrong_smallest',1,true,'\377','A','\377');
-- name: selection_wrong_largest
INSERT INTO byte_selections(id,label,protocol_id,use_code,code,alternative,largest) VALUES (101,'selection_wrong_largest',1,true,'\377','A','A');
-- name: selection_wrong_distinct
INSERT INTO byte_selections(id,label,protocol_id,use_code,code,alternative,different) VALUES (101,'selection_wrong_distinct',1,true,'A','A',true);
-- name: selection_wrong_nullif
INSERT INTO byte_selections(id,label,protocol_id,use_code,code,alternative,unequal_wire) VALUES (101,'selection_wrong_nullif',1,true,'A','B','\x42');
-- name: import_empty
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_empty',1,false,'','\x00',0,'\x00');
-- name: import_ascii
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_ascii',1,false,'Alphabet','\x41',65,'\x41');
-- name: import_utf8
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_utf8',1,false,'éclair','\xc3',-61,'\xc3');
-- name: import_emoji
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_emoji',1,false,'😀','\xf0',-16,'\xf0');
-- name: import_wrapped
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_wrapped',1,false,'\777','\xff',-1,'\xff');
-- name: import_zero_wrapped
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_zero_wrapped',1,false,'\400','\x00',-128,'\x80');
-- name: import_malformed_octal
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_malformed_octal',1,false,'\078','\x5c',92,'\x5c');
-- name: import_null
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire,integer_value,integer_wire) VALUES (101,'import_null',1,false,NULL,NULL,NULL,NULL);
-- name: import_wrong_text
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,source,wire) VALUES (101,'import_wrong_text',1,true,'é','\xe9');
-- name: import_wrong_integer
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,integer_value,integer_wire) VALUES (101,'import_wrong_integer',1,false,-1,'\x7f');
-- name: import_too_low
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,integer_value,integer_wire) VALUES (101,'import_too_low',1,false,-129,'\x00');
-- name: import_too_high
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,integer_value,integer_wire) VALUES (101,'import_too_high',1,false,128,'\x00');
-- name: import_skip_overflow
INSERT INTO byte_imports(id,label,protocol_id,skip_integer,integer_value,integer_wire) VALUES (101,'import_skip_overflow',1,true,128,'\x00');
-- name: ascii_hash_32
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'ASCII 32','\040',-1,1125460419,-4890428145794475946,' ');
-- name: ascii_hash_90
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'ASCII 90','\132',-1,1737842378,-6741569325902610642,'Z');
-- name: ascii_hash_65
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'ASCII 65','\101',-1,-201530951,-9096504042757645515,'A');
-- name: ascii_wrong_hash
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'wrong_hash','A',-1,-201530950,-9096504042757645515,'A');
-- name: ascii_wrong_seeded
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'wrong_seeded','A',-1,-201530951,-9096504042757645514,'A');
-- name: ascii_wrong_padded
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'wrong_padded','A',-1,-201530951,-9096504042757645515,'B');
-- name: ascii_hash_97
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'ASCII 97','\141',-1,463612535,5971021238550862286,'a');
-- name: ascii_null
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'NULL byte',NULL,0,NULL,NULL,NULL);
-- name: ascii_null_seed
INSERT INTO ascii_byte_hashes(id,protocol_id,label,code,seed,hash_word,hash_seeded,padded_text) VALUES(101,1,'NULL seed','A',NULL,NULL,NULL,'A');
