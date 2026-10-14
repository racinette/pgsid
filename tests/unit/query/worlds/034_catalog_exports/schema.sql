-- @world checks
CREATE DOMAIN exported_relation AS regclass;
CREATE DOMAIN nested_relation AS exported_relation;
CREATE TABLE catalog_relations (
 id integer PRIMARY KEY,
 label text NOT NULL,
 relation nested_relation,
 namespace regnamespace,
 row_type regtype,
 relation_wire bytea,
 namespace_wire bytea,
 row_type_wire bytea,
 recorded_word oid,
 reference regclass,
 recorded_order integer,
 recorded_selection regclass,
 CONSTRAINT relation_wire CHECK(regclasssend(relation)=relation_wire),
 CONSTRAINT namespace_wire CHECK(regnamespacesend(namespace)=namespace_wire),
 CONSTRAINT row_type_wire CHECK(regtypesend(row_type)=row_type_wire),
 CONSTRAINT relation_word CHECK(relation::oid=recorded_word AND relation::bigint=recorded_word::bigint),
 CONSTRAINT relation_order CHECK(btoidcmp(relation,reference)=recorded_order),
 CONSTRAINT relation_selection CHECK(COALESCE(relation,reference)=recorded_selection AND CASE WHEN relation IS NULL THEN reference ELSE relation END=recorded_selection)
);
CREATE TABLE catalog_routines (
 id integer PRIMARY KEY,
 relation_id integer NOT NULL REFERENCES catalog_relations(id),
 label text NOT NULL,
 procedure regprocedure,
 function_name regproc,
 operator_signature regoperator,
 operator_name regoper,
 procedure_wire bytea,
 function_wire bytea,
 signature_wire bytea,
 operator_wire bytea,
 CONSTRAINT procedure_wire CHECK(regproceduresend(procedure)=procedure_wire),
 CONSTRAINT function_wire CHECK(regprocsend(function_name)=function_wire),
 CONSTRAINT signature_wire CHECK(regoperatorsend(operator_signature)=signature_wire),
 CONSTRAINT operator_wire CHECK(regopersend(operator_name)=operator_wire)
);
CREATE TABLE catalog_settings (
 id integer PRIMARY KEY,
 relation_id integer NOT NULL REFERENCES catalog_relations(id),
 label text NOT NULL,
 collation_id regcollation,
 configuration regconfig,
 dictionary regdictionary,
 owner_role regrole,
 collation_wire bytea,
 configuration_wire bytea,
 dictionary_wire bytea,
 role_wire bytea,
 CONSTRAINT collation_wire CHECK(regcollationsend(collation_id)=collation_wire),
 CONSTRAINT configuration_wire CHECK(regconfigsend(configuration)=configuration_wire),
 CONSTRAINT dictionary_wire CHECK(regdictionarysend(dictionary)=dictionary_wire),
 CONSTRAINT role_wire CHECK(regrolesend(owner_role)=role_wire)
);
CREATE TABLE catalog_imports (
 id integer PRIMARY KEY,
 relation_id integer NOT NULL REFERENCES catalog_relations(id),
 label text NOT NULL,
 source text,
 recorded_word oid,
 recorded_wire bytea,
 skip_signatures boolean NOT NULL,
 CONSTRAINT imported_names CHECK(oidsend(source::regnamespace)=recorded_wire AND oidsend(source::regtype)=recorded_wire AND oidsend(source::regproc)=recorded_wire AND oidsend(source::regcollation)=recorded_wire AND oidsend(source::regconfig)=recorded_wire AND oidsend(source::regdictionary)=recorded_wire AND oidsend(source::regrole)=recorded_wire),
 CONSTRAINT imported_signatures CHECK(CASE WHEN skip_signatures THEN true ELSE oidsend(source::regprocedure)=recorded_wire AND oidsend(source::regoperator)=recorded_wire AND oidsend(source::regoper)=recorded_wire END),
 CONSTRAINT imported_lookup CHECK(to_regclass(source)::oid=recorded_word AND to_regnamespace(source)::oid=recorded_word AND to_regtype(source)::oid=recorded_word AND to_regproc(source)::oid=recorded_word AND to_regcollation(source)::oid=recorded_word AND to_regrole(source)::oid=recorded_word)
);
