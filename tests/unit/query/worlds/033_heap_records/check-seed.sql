-- name: heap_records_regular
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'heap_records_regular','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,'(4294967295,65535)'::tid);
-- name: heap_hashes_regular
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'heap_hashes_regular','(0,0)'::tid,-1,874415716,8502204026017783902);
-- name: heap_imports_regular
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'heap_imports_regular','garbage(4294967295,65535)trailing','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: zero
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'zero','(0,0)'::tid,'(0,1)'::tid,'\x000000000000'::bytea,'(0,0)',-1,'(0,1)'::tid,'(0,0)'::tid,'(0,0)'::tid);
-- name: first_slot
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'first_slot','(0,1)'::tid,'(0,0)'::tid,'\x000000000001'::bytea,'(0,1)',1,'(0,1)'::tid,'(0,0)'::tid,'(0,1)'::tid);
-- name: last_slot
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'last_slot','(0,65535)'::tid,'(1,0)'::tid,'\x00000000ffff'::bytea,'(0,65535)',-1,'(1,0)'::tid,'(0,65535)'::tid,'(0,65535)'::tid);
-- name: next_block
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'next_block','(1,0)'::tid,'(0,65535)'::tid,'\x000000010000'::bytea,'(1,0)',1,'(1,0)'::tid,'(0,65535)'::tid,'(1,0)'::tid);
-- name: within_block
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'within_block','(1,1)'::tid,'(1,0)'::tid,'\x000000010001'::bytea,'(1,1)',1,'(1,1)'::tid,'(1,0)'::tid,'(1,1)'::tid);
-- name: signed_block_max
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'signed_block_max','(2147483647,65535)'::tid,'(2147483648,0)'::tid,'\x7fffffffffff'::bytea,'(2147483647,65535)',-1,'(2147483648,0)'::tid,'(2147483647,65535)'::tid,'(2147483647,65535)'::tid);
-- name: unsigned_block_high
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'unsigned_block_high','(2147483648,0)'::tid,'(2147483647,65535)'::tid,'\x800000000000'::bytea,'(2147483648,0)',1,'(2147483648,0)'::tid,'(2147483647,65535)'::tid,'(2147483648,0)'::tid);
-- name: equal
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'equal','(4294967295,65535)'::tid,'(4294967295,65535)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',0,'(4294967295,65535)'::tid,'(4294967295,65535)'::tid,'(4294967295,65535)'::tid);
-- name: wire_reject
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'wire_reject','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\x00'::bytea,'(4294967295,65535)',1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,'(4294967295,65535)'::tid);
-- name: text_reject
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'text_reject','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295, 65535)',1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,'(4294967295,65535)'::tid);
-- name: order_reject
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'order_reject','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',-1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,'(4294967295,65535)'::tid);
-- name: large_reject
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'large_reject','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',1,'(0,0)'::tid,'(2147483648,0)'::tid,'(4294967295,65535)'::tid);
-- name: small_reject
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'small_reject','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',1,'(4294967295,65535)'::tid,'(0,0)'::tid,'(4294967295,65535)'::tid);
-- name: coalesced_reject
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'coalesced_reject','(4294967295,65535)'::tid,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,'(0,0)'::tid);
-- name: null_pointer
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'null_pointer',NULL,NULL,'\xffffffffffff'::bytea,'(4294967295,65535)',1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,NULL);
-- name: coalesce_reference
INSERT INTO heap_records (id,label,pointer,reference,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small,recorded_coalesced) VALUES (100,'coalesce_reference',NULL,'(2147483648,0)'::tid,'\xffffffffffff'::bytea,'(4294967295,65535)',1,'(4294967295,65535)'::tid,'(2147483648,0)'::tid,'(2147483648,0)'::tid);
-- name: hash_zero_0
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_zero_0','(0,0)'::tid,0,874415716,2261928584394212964);
-- name: hash_zero_negative_1
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_zero_negative_1','(0,0)'::tid,-1,874415716,8502204026017783902);
-- name: hash_zero_negative_9223372036854775808
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_zero_negative_9223372036854775808','(0,0)'::tid,-9223372036854775808,874415716,-4030000760196135958);
-- name: hash_zero_9223372036854775807
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_zero_9223372036854775807','(0,0)'::tid,9223372036854775807,874415716,7983221677142440750);
-- name: hash_matching_words_0
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_matching_words_0','(65537,0)'::tid,0,-1718105411,119743918422608573);
-- name: hash_matching_words_negative_1
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_matching_words_negative_1','(65537,0)'::tid,-1,-1718105411,8304484073442493566);
-- name: hash_matching_words_negative_9223372036854775808
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_matching_words_negative_9223372036854775808','(65537,0)'::tid,-9223372036854775808,-1718105411,-2371005468798006695);
-- name: hash_matching_words_9223372036854775807
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_matching_words_9223372036854775807','(65537,0)'::tid,9223372036854775807,-1718105411,3139792969399395740);
-- name: hash_maximum_block_0
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_maximum_block_0','(4294967295,0)'::tid,0,-985689234,8353214573687313262);
-- name: hash_maximum_block_negative_1
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_maximum_block_negative_1','(4294967295,0)'::tid,-1,-985689234,-8836211100757089896);
-- name: hash_maximum_block_negative_9223372036854775808
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_maximum_block_negative_9223372036854775808','(4294967295,0)'::tid,-9223372036854775808,-985689234,-5719174201863188189);
-- name: hash_maximum_block_9223372036854775807
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_maximum_block_9223372036854775807','(4294967295,0)'::tid,9223372036854775807,-985689234,95958119886741258);
-- name: recorded_hash_reject
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'recorded_hash_reject','(0,0)'::tid,-1,0,8502204026017783902);
-- name: recorded_extended_reject
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'recorded_extended_reject','(0,0)'::tid,-1,874415716,0);
-- name: hash_null
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_null',NULL,NULL,874415716,8502204026017783902);
-- name: hash_null_seed
INSERT INTO heap_hashes (id,record_id,label,pointer,seed,recorded_hash,recorded_extended) VALUES (100,1,'hash_null_seed','(0,0)'::tid,NULL,874415716,8502204026017783902);
-- name: import_zero
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_zero','(0,0)','(0,0)'::tid,'\x000000000000'::bytea,true,false);
-- name: import_decimal
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_decimal','(077,08)','(77,8)'::tid,'\x0000004d0008'::bytea,true,false);
-- name: import_spaces
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_spaces','( 1, +2)','(1,2)'::tid,'\x000000010002'::bytea,true,false);
-- name: import_legacy_prefix
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_legacy_prefix','1,2,3)','(2,3)'::tid,'\x000000020003'::bytea,true,false);
-- name: import_negative_block
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_negative_block','(-1,1)','(4294967295,1)'::tid,'\xffffffff0001'::bytea,true,false);
-- name: import_recorded_pointer_reject
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_recorded_pointer_reject','garbage(4294967295,65535)trailing','(0,0)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: import_recorded_wire_reject
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_recorded_wire_reject','garbage(4294967295,65535)trailing','(4294967295,65535)'::tid,'\x00'::bytea,true,false);
-- name: import_recorded_present_reject
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_recorded_present_reject','garbage(4294967295,65535)trailing','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,false,false);
-- name: import_null
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_null',NULL,NULL,NULL,NULL,false);
-- name: offset_error
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'offset_error','(1,65536)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: offset_skipped
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'offset_skipped','(1,65536)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,true);
-- name: negative_offset_error
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'negative_offset_error','(1,-1)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: negative_offset_skipped
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'negative_offset_skipped','(1,-1)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,true);
-- name: syntax_error
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'syntax_error','(1,2 )','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: syntax_skipped
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'syntax_skipped','(1,2 )','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,true);
-- name: block_error
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'block_error','(4294967296,1)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: block_skipped
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'block_skipped','(4294967296,1)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,true);
-- name: both_platform_error_error
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'both_platform_error_error','(-2147483649,70000)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,false);
-- name: both_platform_error_skipped
INSERT INTO heap_imports (id,record_id,label,source,recorded_pointer,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'both_platform_error_skipped','(-2147483649,70000)','(4294967295,65535)'::tid,'\xffffffffffff'::bytea,true,true);
