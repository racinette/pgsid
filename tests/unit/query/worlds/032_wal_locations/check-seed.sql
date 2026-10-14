-- name: wal_records_regular
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'wal_records_regular','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: wal_adjustments_regular
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'wal_adjustments_regular','80000000/0'::pg_lsn,'0.5'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: wal_imports_regular
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'wal_imports_regular','ffffffff/FFFFFFFF','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,false);
-- name: zero
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'zero','0/0'::pg_lsn,'0/1'::pg_lsn,'0/0'::pg_lsn,-1,'\x0000000000000000'::bytea,'0/0','-1'::numeric,-1,'0/1'::pg_lsn,'0/0'::pg_lsn);
-- name: one
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'one','0/1'::pg_lsn,'0/0'::pg_lsn,'0/1'::pg_lsn,-1,'\x0000000000000001'::bytea,'0/1','1'::numeric,1,'0/1'::pg_lsn,'0/0'::pg_lsn);
-- name: lower_word_boundary
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'lower_word_boundary','0/FFFFFFFF'::pg_lsn,'1/0'::pg_lsn,'0/FFFFFFFF'::pg_lsn,-1,'\x00000000ffffffff'::bytea,'0/FFFFFFFF','-1'::numeric,-1,'1/0'::pg_lsn,'0/FFFFFFFF'::pg_lsn);
-- name: upper_word_boundary
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'upper_word_boundary','1/0'::pg_lsn,'0/FFFFFFFF'::pg_lsn,'1/0'::pg_lsn,-1,'\x0000000100000000'::bytea,'1/0','1'::numeric,1,'1/0'::pg_lsn,'0/FFFFFFFF'::pg_lsn);
-- name: signed_max
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'signed_max','7FFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'7FFFFFFF/FFFFFFFF'::pg_lsn,-1,'\x7fffffffffffffff'::bytea,'7FFFFFFF/FFFFFFFF','-1'::numeric,-1,'80000000/0'::pg_lsn,'7FFFFFFF/FFFFFFFF'::pg_lsn);
-- name: unsigned_high
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'unsigned_high','80000000/0'::pg_lsn,'7FFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,-1,'\x8000000000000000'::bytea,'80000000/0','1'::numeric,1,'80000000/0'::pg_lsn,'7FFFFFFF/FFFFFFFF'::pg_lsn);
-- name: full_positive_difference
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'full_positive_difference','FFFFFFFF/FFFFFFFF'::pg_lsn,'0/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','18446744073709551615'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'0/0'::pg_lsn);
-- name: full_negative_difference
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'full_negative_difference','0/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,'0/0'::pg_lsn,-1,'\x0000000000000000'::bytea,'0/0','-18446744073709551615'::numeric,-1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'0/0'::pg_lsn);
-- name: equal
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'equal','FFFFFFFF/FFFFFFFF'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','0'::numeric,0,'FFFFFFFF/FFFFFFFF'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn);
-- name: wire_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'wire_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\x00'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: text_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'text_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'ffffffff/ffffffff','9223372036854775807'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: difference_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'difference_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF',0,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: order_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'order_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,-1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: large_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'large_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,1,'0/0'::pg_lsn,'80000000/0'::pg_lsn);
-- name: small_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'small_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'0/0'::pg_lsn);
-- name: hash_reject
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'hash_reject','FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn,'0/0'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: null_location
INSERT INTO wal_records (id,label,location,reference,hash_reference,seed,recorded_wire,recorded_text,recorded_difference,recorded_order,recorded_large,recorded_small) VALUES (100,'null_location',NULL,'80000000/0'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,-1,'\xffffffffffffffff'::bytea,'FFFFFFFF/FFFFFFFF','9223372036854775807'::numeric,1,'FFFFFFFF/FFFFFFFF'::pg_lsn,'80000000/0'::pg_lsn);
-- name: adjust_zero
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_zero','0/0'::pg_lsn,'0'::numeric,'0/0'::pg_lsn,'0/0'::pg_lsn,false);
-- name: adjust_positive
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_positive','0/C'::pg_lsn,'1'::numeric,'0/D'::pg_lsn,'0/B'::pg_lsn,false);
-- name: adjust_negative
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_negative','0/C'::pg_lsn,'-1'::numeric,'0/B'::pg_lsn,'0/D'::pg_lsn,false);
-- name: adjust_fraction_down
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_fraction_down','0/C'::pg_lsn,'0.49'::numeric,'0/C'::pg_lsn,'0/C'::pg_lsn,false);
-- name: adjust_fraction_tie
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_fraction_tie','0/C'::pg_lsn,'0.5'::numeric,'0/D'::pg_lsn,'0/C'::pg_lsn,false);
-- name: adjust_negative_tie
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_negative_tie','0/C'::pg_lsn,'-0.5'::numeric,'0/C'::pg_lsn,'0/D'::pg_lsn,false);
-- name: adjust_maximum
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_maximum','FFFFFFFF/FFFFFFFF'::pg_lsn,'0.49'::numeric,'FFFFFFFF/FFFFFFFF'::pg_lsn,'FFFFFFFF/FFFFFFFF'::pg_lsn,false);
-- name: adjust_signed_cross
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_signed_cross','7FFFFFFF/FFFFFFFF'::pg_lsn,'1.5'::numeric,'80000000/1'::pg_lsn,'7FFFFFFF/FFFFFFFE'::pg_lsn,false);
-- name: adjust_recorded_plus_reject
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_recorded_plus_reject','80000000/0'::pg_lsn,'0.5'::numeric,'0/0'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: adjust_recorded_minus_reject
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_recorded_minus_reject','80000000/0'::pg_lsn,'0.5'::numeric,'80000000/1'::pg_lsn,'0/0'::pg_lsn,false);
-- name: adjust_null
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_null',NULL,NULL,NULL,NULL,false);
-- name: overflow
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'overflow','FFFFFFFF/FFFFFFFF'::pg_lsn,'0.5'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: overflow_skipped
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'overflow_skipped','FFFFFFFF/FFFFFFFF'::pg_lsn,'0.5'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,true);
-- name: underflow
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'underflow','0/0'::pg_lsn,'-0.5'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: underflow_skipped
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'underflow_skipped','0/0'::pg_lsn,'-0.5'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,true);
-- name: subtract_underflow
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'subtract_underflow','0/0'::pg_lsn,'0.5'::numeric,'0/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: subtract_underflow_skipped
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'subtract_underflow_skipped','0/0'::pg_lsn,'0.5'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,true);
-- name: adjust_NaN
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_NaN','80000000/0'::pg_lsn,'NaN'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: adjust_NaN_skipped
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_NaN_skipped','80000000/0'::pg_lsn,'NaN'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,true);
-- name: adjust_Infinity
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_Infinity','80000000/0'::pg_lsn,'Infinity'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: adjust_Infinity_skipped
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_Infinity_skipped','80000000/0'::pg_lsn,'Infinity'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,true);
-- name: adjust_-Infinity
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_-Infinity','80000000/0'::pg_lsn,'-Infinity'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,false);
-- name: adjust_-Infinity_skipped
INSERT INTO wal_adjustments (id,record_id,label,location,amount,recorded_plus,recorded_minus,skip_validation) VALUES (100,1,'adjust_-Infinity_skipped','80000000/0'::pg_lsn,'-Infinity'::numeric,'80000000/1'::pg_lsn,'80000000/0'::pg_lsn,true);
-- name: import_zero
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_zero','0/0','0/0'::pg_lsn,'\x0000000000000000'::bytea,true,false);
-- name: import_padded
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_padded','00000000/00000001','0/1'::pg_lsn,'\x0000000000000001'::bytea,true,false);
-- name: import_mixed_case
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_mixed_case','aBcDeF/AbCdEf','ABCDEF/ABCDEF'::pg_lsn,'\x00abcdef00abcdef'::bytea,true,false);
-- name: import_unsigned_high
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_unsigned_high','80000000/0','80000000/0'::pg_lsn,'\x8000000000000000'::bytea,true,false);
-- name: import_recorded_location_reject
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_recorded_location_reject','ffffffff/FFFFFFFF','0/0'::pg_lsn,'\xffffffffffffffff'::bytea,true,false);
-- name: import_recorded_wire_reject
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_recorded_wire_reject','ffffffff/FFFFFFFF','FFFFFFFF/FFFFFFFF'::pg_lsn,'\x00'::bytea,true,false);
-- name: import_recorded_present_reject
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_recorded_present_reject','ffffffff/FFFFFFFF','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,false,false);
-- name: import_null
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'import_null',NULL,NULL,NULL,NULL,false);
-- name: spaces_error
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'spaces_error',' 0/0','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,false);
-- name: spaces_skipped
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'spaces_skipped',' 0/0','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,true);
-- name: missing_error
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'missing_error','0/','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,false);
-- name: missing_skipped
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'missing_skipped','0/','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,true);
-- name: wide_error
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'wide_error','100000000/0','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,false);
-- name: wide_skipped
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'wide_skipped','100000000/0','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,true);
-- name: prefix_error
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'prefix_error','0x1/0','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,false);
-- name: prefix_skipped
INSERT INTO wal_imports (id,record_id,label,source,recorded_location,recorded_wire,recorded_present,skip_validation) VALUES (100,1,'prefix_skipped','0x1/0','FFFFFFFF/FFFFFFFF'::pg_lsn,'\xffffffffffffffff'::bytea,true,true);
