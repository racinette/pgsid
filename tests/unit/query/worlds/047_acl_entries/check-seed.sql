-- name: supplied_acl_select
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',false,'select',false,5,5,false,false);
-- name: supplied_acl_multiple_rights
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT,INSERT,SELECT',true,'INSERT,SELECT',true,6,6,false,false);
-- name: supplied_acl_maintenance
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(0,4294967295,'MAINTAIN',true,'maintain',true,16383,16383,false,false);
-- name: supplied_acl_hash_wrap
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(4294967295,4294967295,'SELECT',false,'SELECT',false,0,0,false,false);
-- name: supplied_acl_hash_signed
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(2147483647,1,'SELECT',false,'SELECT',false,-2147483646,2147483650,false,false);
-- name: supplied_acl_synonyms
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(12,34,'TEMP',false,'TEMPORARY',false,1070,1070,false,false);
-- name: supplied_acl_null_grantee
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(NULL,2,'SELECT',false,'SELECT',false,NULL,NULL,true,false);
-- name: supplied_acl_strict_null
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'invalid privilege',NULL,'SELECT',false,NULL,NULL,true,false);
-- name: supplied_acl_wrong_rights
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',false,'INSERT',false,5,5,false,false);
-- name: supplied_acl_wrong_grant_option
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',true,'SELECT',false,5,5,false,false);
-- name: supplied_acl_wrong_hash
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,6,5,false,false);
-- name: supplied_acl_wrong_extended_hash
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,5,-1,false,false);
-- name: supplied_acl_wrong_presence
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,5,5,true,false);
-- name: supplied_acl_invalid_privilege
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'ALL',false,'SELECT',false,5,5,false,false);
-- name: supplied_acl_trailing_comma
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT,',false,'SELECT',false,5,5,false,false);
-- name: supplied_acl_skipped_error
INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'ALL',false,'SELECT',false,5,5,false,true);
-- name: acl_array_exact
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,0,true,true,false,false);
-- name: acl_array_privilege_subset
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT,INSERT',true,'SELECT',false,0,true,false,false,false);
-- name: acl_array_grant_subset
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT,INSERT',true,'SELECT',true,0,true,false,false,false);
-- name: acl_array_missing_grant
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',true,0,false,false,false,false);
-- name: acl_array_split_privileges
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT,INSERT',false,5,false,false,false,false);
-- name: acl_array_unsigned_ids
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(4294967295,2147483648,'MAINTAIN',true,'MAINTAIN',true,0,true,true,false,false);
-- name: acl_array_wrong_covers
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'INSERT',false,0,true,false,false,false);
-- name: acl_array_wrong_exact
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT,INSERT',true,'SELECT',false,0,true,true,false,false);
-- name: acl_array_null_entry
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,1,true,true,false,false);
-- name: acl_array_empty
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,2,false,false,false,false);
-- name: acl_array_two_dimensions
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,3,true,true,false,false);
-- name: acl_array_retained_bitmap
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,4,true,true,false,false);
-- name: acl_array_null_probe
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,NULL,false,2,NULL,false,false,false);
-- name: acl_array_obsolete_update
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,0,true,true,true,false);
-- name: acl_array_obsolete_strict_null
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,NULL,false,0,NULL,false,true,false);
-- name: acl_array_skipped_shape
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,3,false,false,false,true);
-- name: acl_defaults_99
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('c',1,0,1,false,false);
-- name: acl_defaults_114
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('r',1,1,1,true,false);
-- name: acl_defaults_115
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('s',1,1,1,true,false);
-- name: acl_defaults_100
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('d',1,2,1,false,false);
-- name: acl_defaults_102
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('f',1,2,1,false,false);
-- name: acl_defaults_108
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('l',1,2,1,false,false);
-- name: acl_defaults_76
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('L',1,1,1,true,false);
-- name: acl_defaults_110
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('n',1,1,1,false,false);
-- name: acl_defaults_112
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('p',1,1,1,false,false);
-- name: acl_defaults_116
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('t',1,1,1,false,false);
-- name: acl_defaults_70
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('F',1,1,1,false,false);
-- name: acl_defaults_83
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('S',1,1,1,false,false);
-- name: acl_defaults_84
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('T',1,2,1,false,false);
-- name: acl_defaults_zero_owner
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('d',0,2,1,false,false);
-- name: acl_defaults_unsigned_owner
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('f',4294967295,2,1,false,false);
-- name: acl_defaults_strict_null_owner
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('x',NULL,NULL,NULL,NULL,false);
-- name: acl_defaults_strict_null_kind
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES(NULL,1,NULL,NULL,NULL,false);
-- name: acl_defaults_wrong_count
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('r',1,2,1,true,false);
-- name: acl_defaults_wrong_dimensions
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('c',1,0,2,false,false);
-- name: acl_defaults_wrong_owner_select
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('r',1,1,1,false,false);
-- name: acl_defaults_invalid_kind
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('x',1,NULL,NULL,NULL,false);
-- name: acl_defaults_skipped_invalid_kind
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('x',1,NULL,NULL,NULL,true);
-- name: acl_cast_regular
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(1,2,'SELECT',5,false);
-- name: acl_cast_zero_identity
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(0,0,'INSERT',1,false);
-- name: acl_cast_unsigned_identity
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(2147483648,4294967295,'SELECT',-2147483647,false);
-- name: acl_cast_domain_check_failure
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(4294967295,4294967295,'SELECT',0,false);
-- name: acl_cast_required_null
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(NULL,2,'SELECT',NULL,false);
-- name: acl_cast_wrong_recorded_hash
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(1,2,'SELECT',6,false);
-- name: acl_cast_skipped_domain_check
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(4294967295,4294967295,'SELECT',0,true);
-- name: acl_cast_skipped_required_null
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(NULL,2,'SELECT',NULL,true);
