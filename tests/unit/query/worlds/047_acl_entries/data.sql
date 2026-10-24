INSERT INTO supplied_acl_entries(grantee,grantor,privileges,grantable,reference_privileges,reference_grantable,expected_hash,expected_extended,expected_absent,bypass) VALUES(1,2,'SELECT',false,'select',false,5,5,false,false);
INSERT INTO supplied_acl_arrays(grantee,grantor,available,available_options,requested,requested_options,shape,expected_covers,expected_exact,try_obsolete,bypass) VALUES(1,2,'SELECT',false,'SELECT',false,0,true,true,false,false);
INSERT INTO supplied_acl_defaults(object_kind,owner_id,expected_count,expected_dimensions,expected_owner_select,bypass) VALUES('r',1,1,1,true,false);
INSERT INTO supplied_acl_casts(grantee,grantor,privileges,expected_hash,bypass) VALUES(1,2,'SELECT',5,false);
