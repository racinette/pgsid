-- @world checks
CREATE DOMAIN imported_object_id AS oid;
CREATE DOMAIN stored_object_id AS imported_object_id;
CREATE TABLE object_records (
 id integer PRIMARY KEY,
 label text NOT NULL,
 identifier stored_object_id,
 recorded_wire bytea,
 recorded_text text,
 hash_reference oid,
 CONSTRAINT object_wire CHECK (oidsend(identifier)=recorded_wire),
 CONSTRAINT object_floor CHECK (identifier >= '2147483648'::oid),
 CONSTRAINT object_text CHECK (identifier::text=recorded_text),
 CONSTRAINT object_hash CHECK (hashoid(identifier)=hashoid(hash_reference))
);
CREATE TABLE object_casts (
 id integer PRIMARY KEY,
 record_id integer NOT NULL REFERENCES object_records(id),
 label text NOT NULL,
 identifier oid,
 signed_word integer,
 wide_word bigint,
 small_word smallint,
 CONSTRAINT object_signed_wire CHECK (oidsend(signed_word::oid)=oidsend(identifier)),
 CONSTRAINT object_small_wire CHECK (oidsend(small_word::oid)=oidsend(identifier)),
 CONSTRAINT object_wide_wire CHECK (oidsend(wide_word::oid)=oidsend(identifier)),
 CONSTRAINT object_widen CHECK (identifier::bigint=wide_word),
 CONSTRAINT object_narrow CHECK (identifier::integer=signed_word)
);
CREATE TABLE object_imports (
 id integer PRIMARY KEY,
 record_id integer NOT NULL REFERENCES object_records(id),
 label text NOT NULL,
 source text,
 identifier oid,
 recorded_wire bytea,
 recorded_text text,
 skip_validation boolean NOT NULL,
 CONSTRAINT object_import_value CHECK (CASE WHEN skip_validation THEN true ELSE source::oid=identifier END),
 CONSTRAINT object_import_wire CHECK (CASE WHEN skip_validation THEN true ELSE oidsend(source::oid)=recorded_wire END),
 CONSTRAINT object_import_text CHECK (CASE WHEN skip_validation THEN true ELSE source::oid::text=recorded_text END)
);
