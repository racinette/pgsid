-- name: capture_pending
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'pending transactions','1:9:3,5','\x000000020000000000000001000000000000000900000000000000030000000000000005','1','9',false);
-- name: capture_empty
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'no pending transactions','1:9:','\x0000000000000000000000010000000000000009','1','9',false);
-- name: capture_full_width
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'full width capture','-2:-1:-2','\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe','18446744073709551614','18446744073709551615',false);
-- name: capture_null
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'absent capture',NULL,NULL,NULL,NULL,true);
-- name: capture_bad_wire
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'incorrect capture bytes','1:9:3,5','\x00','1','9',false);
-- name: capture_bad_lower
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'incorrect lower bound','1:9:',NULL,'2','9',false);
-- name: capture_bad_upper
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'incorrect upper bound','1:9:',NULL,'1','8',false);
-- name: capture_bad_presence
INSERT INTO snapshot_captures(id,label,captured,expected_wire,expected_lower,expected_upper,allow_absent) VALUES(101,'missing required capture',NULL,NULL,NULL,NULL,false);
-- name: request_before_lower
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'before horizon','0','1:9:3,5',true,false,false);
-- name: request_pending
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'pending transaction','3','1:9:3,5',false,false,false);
-- name: request_available
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'available transaction','4','1:9:3,5',true,false,false);
-- name: request_upper
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'upper horizon','9','1:9:3,5',false,false,false);
-- name: request_full_width
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'epoch-qualified transaction','9223372036854775808','9223372036854775807:9223372036854775809:9223372036854775808',false,false,false);
-- name: request_null_candidate
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'unspecified transaction',NULL,'1:9:3,5',true,false,false);
-- name: request_null_snapshot
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'unspecified snapshot','3',NULL,false,false,true);
-- name: request_skipped
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'bypassed request',NULL,NULL,true,true,true);
-- name: request_bad_pending
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'pending transaction marked visible','3','1:9:3,5',true,false,false);
-- name: request_bad_upper
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'upper horizon marked visible','9','1:9:3,5',true,false,false);
-- name: request_bad_presence
INSERT INTO visibility_requests(id,capture_id,label,candidate,submitted,expected_visible,bypass,allow_absent) VALUES(101,1,'missing required snapshot',NULL,NULL,true,true,false);
-- name: legacy_pending
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'legacy pending transaction','1:9:3,5',3,'\x000000020000000000000001000000000000000900000000000000030000000000000005',1,9,false,false);
-- name: legacy_available
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'legacy available transaction','1:9:3,5',4,NULL,1,9,true,false);
-- name: legacy_upper
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'legacy upper horizon','1:9:3,5',9,NULL,1,9,false,false);
-- name: legacy_signed_word
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'legacy signed full-width word','-2:-1:-2',-2,'\x00000001fffffffffffffffefffffffffffffffffffffffffffffffe',-2,-1,false,false);
-- name: legacy_null_snapshot
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'absent legacy snapshot',NULL,3,NULL,NULL,NULL,false,true);
-- name: legacy_null_candidate
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'absent legacy transaction','1:9:3,5',NULL,NULL,1,9,true,false);
-- name: legacy_bad_wire
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'incorrect legacy wire','1:9:3,5',3,'\x00',1,9,false,false);
-- name: legacy_bad_lower
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'incorrect legacy lower bound','1:9:3,5',3,NULL,2,9,false,false);
-- name: legacy_bad_visibility
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'incorrect legacy visibility','1:9:3,5',3,NULL,1,9,true,false);
-- name: legacy_bad_presence
INSERT INTO legacy_captures(id,capture_id,label,captured,candidate,expected_wire,expected_lower,expected_upper,expected_visible,allow_absent) VALUES(101,1,'missing required legacy snapshot',NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: import_normalized
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'normalized capture',' +01:09:03,03,5,','1:9:3,5','1',false);
-- name: import_signed_word
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'negative input word','-2:-1:-2','18446744073709551614:18446744073709551615:18446744073709551614','18446744073709551614',false);
-- name: import_saturated
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'overflow-saturated input','18446744073709551616:18446744073709551617:','18446744073709551615:18446744073709551615:','18446744073709551615',false);
-- name: import_null
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'absent import',NULL,NULL,NULL,false);
-- name: import_skipped_invalid
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'skipped invalid input','invalid','different','1',true);
-- name: import_bad_canonical
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'incorrect canonical text','1:9:3','1:9:5','1',false);
-- name: import_bad_lower
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'incorrect imported bound','1:9:','1:9:','2',false);
-- name: import_invalid_reached
INSERT INTO snapshot_imports(id,capture_id,label,source_text,expected_text,expected_lower,bypass) VALUES(101,1,'reached invalid input','1:9:5,3','unused','1',false);
