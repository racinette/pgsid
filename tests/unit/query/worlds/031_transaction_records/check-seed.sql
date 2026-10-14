-- name: transaction_events_regular
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_events_regular','4294967295'::xid,'4294967295'::xid,-1,'\xffffffff'::bytea,'4294967295');
-- name: command_events_regular
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_events_regular','4294967295'::cid,'4294967295'::cid,'\xffffffff'::bytea,'4294967295');
-- name: full_transaction_events_regular
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_transaction_events_regular','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: identifier_imports_regular
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'identifier_imports_regular','4294967295','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: transaction_zero
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_zero','0'::xid,'0'::xid,0,'\x00000000'::bytea,'0');
-- name: command_zero
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_zero','0'::cid,'0'::cid,'\x00000000'::bytea,'0');
-- name: transaction_bootstrap
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_bootstrap','1'::xid,'1'::xid,1,'\x00000001'::bytea,'1');
-- name: command_bootstrap
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_bootstrap','1'::cid,'1'::cid,'\x00000001'::bytea,'1');
-- name: transaction_frozen
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_frozen','2'::xid,'2'::xid,2,'\x00000002'::bytea,'2');
-- name: command_frozen
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_frozen','2'::cid,'2'::cid,'\x00000002'::bytea,'2');
-- name: transaction_signed_max
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_signed_max','2147483647'::xid,'2147483647'::xid,2147483647,'\x7fffffff'::bytea,'2147483647');
-- name: command_signed_max
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_signed_max','2147483647'::cid,'2147483647'::cid,'\x7fffffff'::bytea,'2147483647');
-- name: transaction_unsigned_high
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_unsigned_high','2147483648'::xid,'2147483648'::xid,-2147483648,'\x80000000'::bytea,'2147483648');
-- name: command_unsigned_high
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_unsigned_high','2147483648'::cid,'2147483648'::cid,'\x80000000'::bytea,'2147483648');
-- name: transaction_near_max
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_near_max','4294967294'::xid,'4294967294'::xid,-2,'\xfffffffe'::bytea,'4294967294');
-- name: command_near_max
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_near_max','4294967294'::cid,'4294967294'::cid,'\xfffffffe'::bytea,'4294967294');
-- name: transaction_events_missing
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_events_missing',NULL,NULL,NULL,NULL,NULL);
-- name: command_events_missing
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_events_missing',NULL,NULL,NULL,NULL);
-- name: full_transaction_events_missing
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_transaction_events_missing',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
-- name: transaction_same_reject
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_same_reject','4294967295'::xid,'0'::xid,-1,'\xffffffff'::bytea,'4294967295');
-- name: transaction_mixed_reject
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_mixed_reject','4294967295'::xid,'4294967295'::xid,0,'\xffffffff'::bytea,'4294967295');
-- name: transaction_wire_reject
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_wire_reject','4294967295'::xid,'4294967295'::xid,-1,'\x00'::bytea,'4294967295');
-- name: transaction_text_reject
INSERT INTO transaction_events (id,label,transaction_word,reference_word,signed_word,recorded_wire,recorded_text) VALUES (100,'transaction_text_reject','4294967295'::xid,'4294967295'::xid,-1,'\xffffffff'::bytea,'-1');
-- name: command_same_reject
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_same_reject','4294967295'::cid,'0'::cid,'\xffffffff'::bytea,'4294967295');
-- name: command_wire_reject
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_wire_reject','4294967295'::cid,'4294967295'::cid,'\x00'::bytea,'4294967295');
-- name: command_text_reject
INSERT INTO command_events (id,transaction_id,label,command_word,reference_word,recorded_wire,recorded_text) VALUES (100,1,'command_text_reject','4294967295'::cid,'4294967295'::cid,'\xffffffff'::bytea,'-1');
-- name: full_zero
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_zero','0'::xid8,'1'::xid8,'0'::xid8,-1,'0'::xid,'\x0000000000000000'::bytea,'0',-1,'1'::xid8,'0'::xid8);
-- name: full_one
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_one','1'::xid8,'0'::xid8,'1'::xid8,-1,'1'::xid,'\x0000000000000001'::bytea,'1',1,'1'::xid8,'0'::xid8);
-- name: full_last_epoch_word
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_last_epoch_word','4294967295'::xid8,'4294967296'::xid8,'4294967295'::xid8,-1,'4294967295'::xid,'\x00000000ffffffff'::bytea,'4294967295',-1,'4294967296'::xid8,'4294967295'::xid8);
-- name: full_next_epoch
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_next_epoch','4294967296'::xid8,'0'::xid8,'4294967296'::xid8,-1,'0'::xid,'\x0000000100000000'::bytea,'4294967296',1,'4294967296'::xid8,'0'::xid8);
-- name: full_signed_boundary
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_signed_boundary','9223372036854775807'::xid8,'9223372036854775808'::xid8,'9223372036854775807'::xid8,-1,'4294967295'::xid,'\x7fffffffffffffff'::bytea,'9223372036854775807',-1,'9223372036854775808'::xid8,'9223372036854775807'::xid8);
-- name: full_unsigned_boundary
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_unsigned_boundary','9223372036854775808'::xid8,'9223372036854775807'::xid8,'9223372036854775808'::xid8,-1,'0'::xid,'\x8000000000000000'::bytea,'9223372036854775808',1,'9223372036854775808'::xid8,'9223372036854775807'::xid8);
-- name: full_near_max
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_near_max','18446744073709551614'::xid8,'18446744073709551615'::xid8,'18446744073709551614'::xid8,-1,'4294967294'::xid,'\xfffffffffffffffe'::bytea,'18446744073709551614',-1,'18446744073709551615'::xid8,'18446744073709551614'::xid8);
-- name: full_equal
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_equal','18446744073709551615'::xid8,'18446744073709551615'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',0,'18446744073709551615'::xid8,'18446744073709551615'::xid8);
-- name: full_negative_input
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_negative_input','-1'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_negative_large_input
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_negative_large_input','-18446744073709551615'::xid8,'0'::xid8,'1'::xid8,-1,'1'::xid,'\x0000000000000001'::bytea,'1',1,'1'::xid8,'0'::xid8);
-- name: full_wire_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_wire_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\x00'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_text_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_text_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'-1',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_low_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_low_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'0'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_order_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_order_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',-1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_large_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_large_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'0'::xid8,'9223372036854775808'::xid8);
-- name: full_small_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_small_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'0'::xid8);
-- name: full_hash_reject
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_hash_reject','18446744073709551615'::xid8,'9223372036854775808'::xid8,'0'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_reference_word
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_reference_word','18446744073709551615'::xid8,NULL,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_hash_reference
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_hash_reference','18446744073709551615'::xid8,'9223372036854775808'::xid8,NULL,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_hash_seed
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_hash_seed','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,NULL,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_recorded_low
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_recorded_low','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,NULL,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_recorded_wire
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_recorded_wire','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,NULL,'18446744073709551615',1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_recorded_text
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_recorded_text','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,NULL,1,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_recorded_order
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_recorded_order','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',NULL,'18446744073709551615'::xid8,'9223372036854775808'::xid8);
-- name: full_nullable_recorded_large
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_recorded_large','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,NULL,'9223372036854775808'::xid8);
-- name: full_nullable_recorded_small
INSERT INTO full_transaction_events (id,transaction_id,label,full_word,reference_word,hash_reference,hash_seed,recorded_low,recorded_wire,recorded_text,recorded_order,recorded_large,recorded_small) VALUES (100,1,'full_nullable_recorded_small','18446744073709551615'::xid8,'9223372036854775808'::xid8,'18446744073709551615'::xid8,-1,'4294967295'::xid,'\xffffffffffffffff'::bytea,'18446744073709551615',1,'18446744073709551615'::xid8,NULL);
-- name: import_zero
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_zero','0','0'::xid,'0'::cid,'0'::xid8,false);
-- name: import_octal
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_octal','0777','511'::xid,'511'::cid,'511'::xid8,false);
-- name: import_hex
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_hex','0xffffffff','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_negative
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_negative','-1','4294967295'::xid,'4294967295'::cid,'18446744073709551615'::xid8,false);
-- name: import_negative_min
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_negative_min','-2147483648','2147483648'::xid,'2147483648'::cid,'18446744071562067968'::xid8,false);
-- name: import_spaces
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_spaces','  +12  ','12'::xid,'12'::cid,'12'::xid8,false);
-- name: import_missing
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_missing',NULL,NULL,NULL,NULL,false);
-- name: import_recorded_transaction_reject
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_recorded_transaction_reject','4294967295','0'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_recorded_command_reject
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_recorded_command_reject','4294967295','4294967295'::xid,'0'::cid,'4294967295'::xid8,false);
-- name: import_recorded_full_reject
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_recorded_full_reject','4294967295','4294967295'::xid,'4294967295'::cid,'0'::xid8,false);
-- name: import_range32_error
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_range32_error','4294967296','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_range32_skipped
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_range32_skipped','4294967296','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,true);
-- name: import_range64_error
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_range64_error','18446744073709551616','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_range64_skipped
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_range64_skipped','18446744073709551616','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,true);
-- name: import_negative_range64_error
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_negative_range64_error','-18446744073709551616','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_negative_range64_skipped
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_negative_range64_skipped','-18446744073709551616','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,true);
-- name: import_syntax_error
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_syntax_error','bad','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_syntax_skipped
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_syntax_skipped','bad','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,true);
-- name: import_underscore_error
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_underscore_error','1_000','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,false);
-- name: import_underscore_skipped
INSERT INTO identifier_imports (id,transaction_id,label,source,recorded_transaction,recorded_command,recorded_full,skip_validation) VALUES (100,1,'import_underscore_skipped','1_000','4294967295'::xid,'4294967295'::cid,'4294967295'::xid8,true);
