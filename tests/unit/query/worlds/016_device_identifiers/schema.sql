-- @world checks
CREATE DOMAIN device_identifier AS uuid;
CREATE DOMAIN installed_identifier AS device_identifier;

CREATE TABLE device_identifiers (
  id integer PRIMARY KEY,
  identifier installed_identifier,
  floor_identifier uuid,
  ceiling_identifier uuid,
  backup_identifier uuid,
  recorded_identifier uuid,
  prefer_primary boolean,
  recorded_text text COLLATE "C",
  comparison integer,
  CONSTRAINT identifier_nonzero CHECK (identifier <> '00000000-0000-0000-0000-000000000000'::uuid),
  CONSTRAINT identifier_range CHECK (identifier BETWEEN floor_identifier AND ceiling_identifier),
  CONSTRAINT identifier_default CHECK (COALESCE(identifier, backup_identifier) = recorded_identifier),
  CONSTRAINT identifier_selected CHECK ((CASE WHEN prefer_primary THEN identifier ELSE backup_identifier END) = recorded_identifier),
  CONSTRAINT identifier_allowed CHECK (identifier IN (backup_identifier, recorded_identifier)),
  CONSTRAINT identifier_text CHECK (identifier::text = recorded_text),
  CONSTRAINT identifier_comparison CHECK (uuid_cmp(identifier, ceiling_identifier) = comparison),
  CONSTRAINT identifier_recognized CHECK (CASE identifier WHEN recorded_identifier THEN true ELSE identifier IS NULL END)
);

CREATE TABLE identifier_imports (
  id integer PRIMARY KEY,
  raw_identifier text,
  legacy_identifier varchar,
  recorded_identifier uuid,
  skip_import boolean,
  CONSTRAINT import_parsed CHECK (raw_identifier::uuid = recorded_identifier),
  CONSTRAINT import_legacy CHECK (uuid(legacy_identifier) = recorded_identifier),
  CONSTRAINT import_lazy CHECK (CASE WHEN skip_import THEN true ELSE raw_identifier::uuid = recorded_identifier END),
  CONSTRAINT import_selected CHECK ((CASE WHEN skip_import THEN recorded_identifier ELSE raw_identifier::uuid END) = recorded_identifier),
  CONSTRAINT import_default CHECK (COALESCE(recorded_identifier, raw_identifier::uuid) = recorded_identifier),
  CONSTRAINT import_roundtrip CHECK ((text(recorded_identifier))::uuid = recorded_identifier)
);

CREATE TABLE identifier_fingerprints (
  id integer PRIMARY KEY,
  identifier installed_identifier,
  raw_identifier text,
  seed bigint,
  recorded_wire bytea,
  recorded_hash integer,
  recorded_seeded bigint,
  recorded_zero bigint,
  recorded_version smallint,
  skip_parse boolean,
  CONSTRAINT fingerprint_wire CHECK (uuid_send(identifier) = recorded_wire),
  CONSTRAINT fingerprint_hash CHECK (uuid_hash(identifier) = recorded_hash),
  CONSTRAINT fingerprint_seeded CHECK (uuid_hash_extended(identifier, seed) = recorded_seeded),
  CONSTRAINT fingerprint_zero CHECK (uuid_hash_extended(identifier, 0) = recorded_zero),
  CONSTRAINT fingerprint_version CHECK (uuid_extract_version(identifier) = recorded_version),
  CONSTRAINT fingerprint_version_null CHECK ((uuid_extract_version(identifier) IS NULL) = (recorded_version IS NULL)),
  CONSTRAINT fingerprint_version_default CHECK (COALESCE(uuid_extract_version(identifier), -1::smallint) = COALESCE(recorded_version, -1::smallint)),
  CONSTRAINT fingerprint_parsed_hash CHECK (uuid_hash(raw_identifier::uuid) = recorded_hash),
  CONSTRAINT fingerprint_parsed_wire CHECK (uuid_send(raw_identifier::uuid) = recorded_wire),
  CONSTRAINT fingerprint_parsed_version CHECK (uuid_extract_version(raw_identifier::uuid) = recorded_version),
  CONSTRAINT fingerprint_lazy_parse CHECK (CASE WHEN skip_parse THEN true ELSE uuid_hash_extended(raw_identifier::uuid, seed) = recorded_seeded END)
);
