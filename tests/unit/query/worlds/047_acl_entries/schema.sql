-- @world checks
CREATE TABLE supplied_acl_entries (
 grantee oid,
 grantor oid,
 privileges text,
 grantable boolean,
 reference_privileges text,
 reference_grantable boolean,
 expected_hash integer,
 expected_extended bigint,
 expected_absent boolean,
 bypass boolean,
 CONSTRAINT supplied_acl_equality CHECK(CASE WHEN bypass THEN true ELSE makeaclitem(grantee,grantor,privileges,grantable)=makeaclitem(grantee,grantor,reference_privileges,reference_grantable) END),
 CONSTRAINT supplied_acl_hash CHECK(CASE WHEN bypass THEN true ELSE hash_aclitem(makeaclitem(grantee,grantor,privileges,grantable))=expected_hash END),
 CONSTRAINT supplied_acl_extended CHECK(CASE WHEN bypass THEN true ELSE hash_aclitem_extended(makeaclitem(grantee,grantor,privileges,grantable),0)=expected_extended END),
 CONSTRAINT supplied_acl_presence CHECK(CASE WHEN bypass THEN true ELSE ((makeaclitem(grantee,grantor,privileges,grantable) IS NULL)=expected_absent AND NULL::aclitem IS NULL) END)
);

CREATE TABLE supplied_acl_arrays (
 grantee oid,
 grantor oid,
 available text,
 available_options boolean,
 requested text,
 requested_options boolean,
 shape integer,
 expected_covers boolean,
 expected_exact boolean,
 try_obsolete boolean,
 bypass boolean,
 CONSTRAINT supplied_acl_covers CHECK(CASE WHEN bypass THEN true ELSE aclcontains((CASE shape WHEN 1 THEN ARRAY[NULL::aclitem,makeaclitem(grantee,grantor,available,available_options)] WHEN 2 THEN ARRAY[]::aclitem[] WHEN 3 THEN ARRAY[[makeaclitem(grantee,grantor,available,available_options)]] WHEN 4 THEN (ARRAY[makeaclitem(grantee,grantor,available,available_options),NULL::aclitem])[1:1] WHEN 5 THEN ARRAY[makeaclitem(grantee,grantor,available,available_options),makeaclitem(grantee,grantor,'INSERT',false)] ELSE ARRAY[makeaclitem(grantee,grantor,available,available_options)] END),makeaclitem(grantee,grantor,requested,requested_options))=expected_covers END),
 CONSTRAINT supplied_acl_whole_entry CHECK(CASE WHEN bypass THEN true ELSE ((CASE shape WHEN 1 THEN ARRAY[NULL::aclitem,makeaclitem(grantee,grantor,available,available_options)] WHEN 2 THEN ARRAY[]::aclitem[] WHEN 3 THEN ARRAY[[makeaclitem(grantee,grantor,available,available_options)]] WHEN 4 THEN (ARRAY[makeaclitem(grantee,grantor,available,available_options),NULL::aclitem])[1:1] WHEN 5 THEN ARRAY[makeaclitem(grantee,grantor,available,available_options),makeaclitem(grantee,grantor,'INSERT',false)] ELSE ARRAY[makeaclitem(grantee,grantor,available,available_options)] END) @> ARRAY[makeaclitem(grantee,grantor,requested,requested_options)])=expected_exact END),
 CONSTRAINT supplied_acl_obsolete CHECK(CASE WHEN try_obsolete THEN aclinsert((CASE shape WHEN 1 THEN ARRAY[NULL::aclitem,makeaclitem(grantee,grantor,available,available_options)] WHEN 2 THEN ARRAY[]::aclitem[] WHEN 3 THEN ARRAY[[makeaclitem(grantee,grantor,available,available_options)]] WHEN 4 THEN (ARRAY[makeaclitem(grantee,grantor,available,available_options),NULL::aclitem])[1:1] WHEN 5 THEN ARRAY[makeaclitem(grantee,grantor,available,available_options),makeaclitem(grantee,grantor,'INSERT',false)] ELSE ARRAY[makeaclitem(grantee,grantor,available,available_options)] END),makeaclitem(grantee,grantor,requested,requested_options)) IS NULL ELSE true END)
);

CREATE TABLE supplied_acl_defaults (
 object_kind "char",
 owner_id oid,
 expected_count integer,
 expected_dimensions integer,
 expected_owner_select boolean,
 bypass boolean,
 CONSTRAINT acl_default_shape CHECK(CASE WHEN bypass THEN true ELSE cardinality(acldefault(object_kind,owner_id))=expected_count AND array_length(acldefault(object_kind,owner_id),1)=expected_count AND array_lower(acldefault(object_kind,owner_id),1)=1 AND array_upper(acldefault(object_kind,owner_id),1)=expected_count END),
 CONSTRAINT acl_default_dimensions CHECK(CASE WHEN bypass THEN true ELSE array_ndims(acldefault(object_kind,owner_id))=expected_dimensions END),
 CONSTRAINT acl_default_owner_select CHECK(CASE WHEN bypass THEN true ELSE aclcontains(acldefault(object_kind,owner_id),makeaclitem(owner_id,owner_id,'SELECT',false))=expected_owner_select END),
 CONSTRAINT acl_default_grant_options CHECK(CASE WHEN bypass THEN true ELSE NOT aclcontains(acldefault(object_kind,owner_id),makeaclitem(owner_id,owner_id,'SELECT',true)) END)
);

CREATE DOMAIN nonzero_acl AS aclitem CHECK(hash_aclitem(VALUE)<>0);
CREATE DOMAIN required_acl AS nonzero_acl NOT NULL;
CREATE TYPE acl_audit_leaf AS(entry required_acl,history nonzero_acl[]);
CREATE TABLE supplied_acl_casts (
 grantee oid,
 grantor oid,
 privileges text,
 expected_hash integer,
 bypass boolean,
 CONSTRAINT acl_checked_required CHECK(CASE WHEN bypass THEN true ELSE hash_aclitem(makeaclitem(grantee,grantor,privileges,false)::required_acl)=expected_hash END),
 CONSTRAINT acl_checked_array CHECK(CASE WHEN bypass THEN true ELSE cardinality(ARRAY[makeaclitem(grantee,grantor,privileges,false),NULL::aclitem]::nonzero_acl[])=2 END),
 CONSTRAINT acl_checked_record CHECK(CASE WHEN bypass THEN true ELSE (ROW(makeaclitem(grantee,grantor,privileges,false),ARRAY[makeaclitem(grantee,grantor,privileges,false)])::acl_audit_leaf).entry IS NOT DISTINCT FROM makeaclitem(grantee,grantor,privileges,false) END),
 CONSTRAINT acl_checked_record_discarded_field CHECK(CASE WHEN bypass THEN true ELSE cardinality((ROW(makeaclitem(grantee,grantor,privileges,false),ARRAY[makeaclitem(grantee,grantor,privileges,false)])::acl_audit_leaf).history)=1 END)
);

CREATE TABLE acl_text_imports (
 source_text text,
 expected_absent boolean,
 bypass boolean,
 CONSTRAINT acl_import_presence CHECK(CASE WHEN bypass THEN true ELSE (source_text::aclitem IS NULL)=expected_absent END),
 CONSTRAINT acl_import_array CHECK(CASE WHEN bypass THEN true ELSE cardinality(ARRAY[source_text]::aclitem[])=1 END)
);

CREATE TABLE supplied_acl_rendering (
 grantee oid,
 grantor oid,
 privileges text,
 expected_absent boolean,
 expected_rendered boolean,
 bypass boolean,
 CONSTRAINT acl_render_presence CHECK(CASE WHEN bypass THEN true ELSE (makeaclitem(grantee,grantor,privileges,false)::text IS NULL)=expected_absent END),
 CONSTRAINT acl_render_containers CHECK(CASE WHEN bypass THEN true ELSE ((ARRAY[makeaclitem(grantee,grantor,privileges,false)]::text IS NOT NULL) AND (ROW(makeaclitem(grantee,grantor,privileges,false),1)::text IS NOT NULL))=expected_rendered END)
);
