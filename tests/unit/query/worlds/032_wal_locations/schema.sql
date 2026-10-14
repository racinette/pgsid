-- @world checks
CREATE DOMAIN stored_location AS pg_lsn;
CREATE DOMAIN nested_location AS stored_location;
CREATE TABLE wal_records (
 id integer PRIMARY KEY,
 label text NOT NULL,
 location nested_location,
 reference pg_lsn,
 hash_reference pg_lsn,
 seed bigint,
 recorded_wire bytea,
 recorded_text text,
 recorded_difference numeric,
 recorded_order integer,
 recorded_large pg_lsn,
 recorded_small pg_lsn,
 CONSTRAINT location_wire CHECK(pg_lsn_send(location)=recorded_wire),
 CONSTRAINT location_text CHECK(location::text=recorded_text),
 CONSTRAINT location_difference CHECK(location-reference=recorded_difference AND pg_wal_lsn_diff(location,reference)=recorded_difference),
 CONSTRAINT location_order CHECK(pg_lsn_cmp(location,reference)=recorded_order),
 CONSTRAINT location_selection CHECK(pg_lsn_larger(location,reference)=recorded_large AND pg_lsn_smaller(location,reference)=recorded_small),
 CONSTRAINT location_hash CHECK(pg_lsn_hash(location)=pg_lsn_hash(hash_reference) AND pg_lsn_hash_extended(location,seed)=pg_lsn_hash_extended(hash_reference,seed))
);
CREATE TABLE wal_adjustments (
 id integer PRIMARY KEY,
 record_id integer NOT NULL REFERENCES wal_records(id),
 label text NOT NULL,
 location nested_location,
 amount numeric,
 recorded_plus pg_lsn,
 recorded_minus pg_lsn,
 skip_validation boolean NOT NULL,
 CONSTRAINT location_plus CHECK(CASE WHEN skip_validation THEN true ELSE location+amount=recorded_plus END),
 CONSTRAINT location_minus CHECK(CASE WHEN skip_validation THEN true ELSE location-amount=recorded_minus END),
 CONSTRAINT location_commute CHECK(CASE WHEN skip_validation THEN true ELSE amount+location=recorded_plus END)
);
CREATE TABLE wal_imports (
 id integer PRIMARY KEY,
 record_id integer NOT NULL REFERENCES wal_records(id),
 label text NOT NULL,
 source text,
 recorded_location pg_lsn,
 recorded_wire bytea,
 recorded_present boolean,
 skip_validation boolean NOT NULL,
 CONSTRAINT imported_location CHECK(CASE WHEN skip_validation THEN true ELSE source::nested_location=recorded_location END),
 CONSTRAINT imported_wire CHECK(CASE WHEN skip_validation THEN true ELSE pg_lsn_send(source::pg_lsn)=recorded_wire END),
 CONSTRAINT imported_present CHECK(CASE WHEN skip_validation THEN true ELSE (source::pg_lsn IS NOT NULL)=recorded_present END)
);
