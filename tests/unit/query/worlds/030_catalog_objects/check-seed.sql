-- name: object_records_regular
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'object_records_regular','4294967295'::oid,'\xffffffff'::bytea,'4294967295','4294967295'::oid);
-- name: object_casts_regular
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'object_casts_regular','4294967295'::oid,-1,4294967295,-1);
-- name: object_imports_regular
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'object_imports_regular','0xffffffff','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: unsigned_boundary
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'unsigned_boundary','2147483648'::oid,'\x80000000'::bytea,'2147483648','2147483648'::oid);
-- name: unsigned_near_max
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'unsigned_near_max','4294967294'::oid,'\xfffffffe'::bytea,'4294967294','4294967294'::oid);
-- name: identifier_missing
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'identifier_missing',NULL,NULL,NULL,NULL);
-- name: recordings_missing
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'recordings_missing','4294967295'::oid,NULL,NULL,NULL);
-- name: unsigned_floor_reject
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'unsigned_floor_reject','2147483647'::oid,'\x7fffffff'::bytea,'2147483647','2147483647'::oid);
-- name: wire_reject
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'wire_reject','4294967295'::oid,'\x00'::bytea,'4294967295','4294967295'::oid);
-- name: text_reject
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'text_reject','4294967295'::oid,'\xffffffff'::bytea,'-1','4294967295'::oid);
-- name: hash_reject
INSERT INTO object_records (id,label,identifier,recorded_wire,recorded_text,hash_reference) VALUES (100,'hash_reject','4294967295'::oid,'\xffffffff'::bytea,'4294967295','1'::oid);
-- name: cast_zero
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_zero','0'::oid,0,0,0);
-- name: cast_positive
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_positive','32767'::oid,32767,32767,32767);
-- name: cast_small_min
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_small_min','4294934528'::oid,-32768,4294934528,-32768);
-- name: cast_signed_min
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_signed_min','2147483648'::oid,-2147483648,2147483648,NULL);
-- name: cast_missing
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_missing',NULL,NULL,NULL,NULL);
-- name: cast_nullable_identifier
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_nullable_identifier',NULL,-1,4294967295,-1);
-- name: cast_nullable_signed_word
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_nullable_signed_word','4294967295'::oid,NULL,4294967295,-1);
-- name: cast_nullable_wide_word
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_nullable_wide_word','4294967295'::oid,-1,NULL,-1);
-- name: cast_nullable_small_word
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_nullable_small_word','4294967295'::oid,-1,4294967295,NULL);
-- name: cast_reject_identifier
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_reject_identifier','1'::oid,-1,4294967295,-1);
-- name: cast_reject_signed_word
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_reject_signed_word','4294967295'::oid,1,4294967295,-1);
-- name: cast_reject_wide_word
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_reject_wide_word','4294967295'::oid,-1,1,-1);
-- name: cast_reject_small_word
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'cast_reject_small_word','4294967295'::oid,-1,4294967295,1);
-- name: wide_negative
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'wide_negative','4294967295'::oid,-1,-1,-1);
-- name: wide_negative_min
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'wide_negative_min','4294967295'::oid,-1,-9223372036854775808,-1);
-- name: wide_overflow
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'wide_overflow','4294967295'::oid,-1,4294967296,-1);
-- name: wide_largest_signed
INSERT INTO object_casts (id,record_id,label,identifier,signed_word,wide_word,small_word) VALUES (100,1,'wide_largest_signed','4294967295'::oid,-1,9223372036854775807,-1);
-- name: input_decimal
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_decimal','4294967295','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_octal
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_octal','0777','511'::oid,'\x000001ff'::bytea,'511',false);
-- name: input_hex
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_hex','0Xff','255'::oid,'\x000000ff'::bytea,'255',false);
-- name: input_negative
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_negative','-1','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_negative_min
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_negative_min','-2147483648','2147483648'::oid,'\x80000000'::bytea,'2147483648',false);
-- name: input_zero
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_zero','-0','0'::oid,'\x00000000'::bytea,'0',false);
-- name: input_spaces
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_spaces','  +12  ','12'::oid,'\x0000000c'::bytea,'12',false);
-- name: input_missing
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_missing',NULL,NULL,NULL,NULL,false);
-- name: input_nullable
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_nullable','0xffffffff',NULL,NULL,NULL,false);
-- name: input_value_reject
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_value_reject','0xffffffff','1'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_wire_reject
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_wire_reject','0xffffffff','4294967295'::oid,'\x00'::bytea,'4294967295',false);
-- name: input_text_reject
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_text_reject','0xffffffff','4294967295'::oid,'\xffffffff'::bytea,'-1',false);
-- name: input_overflow_error
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_overflow_error','4294967296','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_overflow_skipped
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_overflow_skipped','4294967296','4294967295'::oid,'\xffffffff'::bytea,'4294967295',true);
-- name: input_large_error
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_large_error','999999999999999999999','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_large_skipped
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_large_skipped','999999999999999999999','4294967295'::oid,'\xffffffff'::bytea,'4294967295',true);
-- name: input_invalid_error
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_invalid_error','bad','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_invalid_skipped
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_invalid_skipped','bad','4294967295'::oid,'\xffffffff'::bytea,'4294967295',true);
-- name: input_underscore_error
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_underscore_error','1_000','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_underscore_skipped
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_underscore_skipped','1_000','4294967295'::oid,'\xffffffff'::bytea,'4294967295',true);
-- name: input_octal_invalid_error
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_octal_invalid_error','08','4294967295'::oid,'\xffffffff'::bytea,'4294967295',false);
-- name: input_octal_invalid_skipped
INSERT INTO object_imports (id,record_id,label,source,identifier,recorded_wire,recorded_text,skip_validation) VALUES (100,1,'input_octal_invalid_skipped','08','4294967295'::oid,'\xffffffff'::bytea,'4294967295',true);
