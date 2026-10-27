-- @world checks
CREATE TYPE catalog_layout AS (positions int2vector, type_ids oidvector);

CREATE TABLE catalog_metadata_exports (
  type_id oid,
  modifier integer,
  divisor integer,
  expected_name text COLLATE "C",
  label text,
  bypass boolean NOT NULL,
  CONSTRAINT metadata_type_name CHECK (CASE WHEN bypass THEN true ELSE format_type(type_id,modifier/divisor) IS NOT DISTINCT FROM expected_name END),
  CONSTRAINT metadata_label_collation CHECK (CASE WHEN bypass THEN true ELSE pg_collation_for(label) IS NOT NULL END)
);

CREATE TABLE catalog_metadata_errors (
  type_id oid,
  expected_name text COLLATE "C",
  item_count integer,
  divisor integer,
  bypass boolean NOT NULL,
  CONSTRAINT metadata_error_type_name CHECK (CASE WHEN bypass THEN true ELSE format_type(type_id,NULL) IS NOT DISTINCT FROM expected_name END),
  CONSTRAINT metadata_noncollatable CHECK (CASE WHEN bypass THEN true ELSE pg_collation_for(item_count/divisor) IS NULL END)
);

CREATE TABLE catalog_layout_exports (
  positions int2vector,
  type_ids oidvector,
  packet catalog_layout,
  history int2vector[],
  encoded_positions text,
  expected_count integer,
  expected_json text,
  bypass boolean NOT NULL,
  CONSTRAINT position_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(positions) = expected_count END),
  CONSTRAINT type_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(type_ids) = expected_count END),
  CONSTRAINT packet_positions CHECK (CASE WHEN bypass THEN true ELSE (packet).positions IS NOT DISTINCT FROM positions END),
  CONSTRAINT packet_types CHECK (CASE WHEN bypass THEN true ELSE (packet).type_ids IS NOT DISTINCT FROM type_ids END),
  CONSTRAINT history_positions CHECK (CASE WHEN bypass THEN true ELSE history[1] IS NOT DISTINCT FROM positions END),
  CONSTRAINT decoded_positions CHECK (CASE WHEN bypass THEN true ELSE encoded_positions::int2vector IS NOT DISTINCT FROM positions END),
  CONSTRAINT json_packet CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(packet)::text = expected_json END),
  CONSTRAINT nonnegative_positions CHECK (CASE WHEN bypass THEN true ELSE 0::smallint <= ALL(positions) END),
  CONSTRAINT template_types CHECK (CASE WHEN bypass THEN true ELSE positions <> ARRAY[1,2]::int2vector OR type_ids = ARRAY[0,0]::oidvector END)
);

CREATE TYPE position_window AS RANGE (subtype=int2vector, multirange_type_name=position_windows);
CREATE DOMAIN exported_type_vector AS oidvector CHECK (cardinality(VALUE)<=3);
CREATE TYPE type_window AS RANGE (subtype=exported_type_vector, multirange_type_name=type_windows);
CREATE TYPE catalog_extent AS (positions position_window, types type_windows);

CREATE TABLE catalog_extent_exports (
  positions position_window,
  type_groups type_windows,
  packet catalog_extent,
  needle exported_type_vector,
  expected_contains boolean,
  encoded_positions text,
  position_text text,
  type_text text,
  expected_lower integer,
  expected_wire integer,
  bypass boolean NOT NULL,
  CONSTRAINT extent_position_output CHECK (CASE WHEN bypass THEN true ELSE positions::text = position_text END),
  CONSTRAINT extent_type_output CHECK (CASE WHEN bypass THEN true ELSE type_groups::text = type_text END),
  CONSTRAINT extent_input CHECK (CASE WHEN bypass THEN true ELSE encoded_positions::position_window = positions END),
  CONSTRAINT extent_member CHECK (CASE WHEN bypass THEN true ELSE (type_groups @> needle) IS NOT DISTINCT FROM expected_contains END),
  CONSTRAINT extent_bound_origin CHECK (CASE WHEN bypass THEN true ELSE array_lower(lower(positions),1) IS NOT DISTINCT FROM expected_lower END),
  CONSTRAINT extent_wire CHECK (CASE WHEN bypass THEN true ELSE octet_length(range_send(positions)) IS NOT DISTINCT FROM expected_wire END),
  CONSTRAINT extent_packet_positions CHECK (CASE WHEN bypass THEN true ELSE (packet).positions IS NOT DISTINCT FROM positions END),
  CONSTRAINT extent_packet_types CHECK (CASE WHEN bypass THEN true ELSE (packet).types IS NOT DISTINCT FROM type_groups END),
  CONSTRAINT extent_array_member CHECK (CASE WHEN bypass THEN true ELSE array_position(ARRAY[type_groups],(packet).types) IS NOT DISTINCT FROM 1 END),
  CONSTRAINT extent_packet_json CHECK (CASE WHEN bypass THEN true ELSE (to_jsonb(packet)->'positions') IS NOT DISTINCT FROM to_jsonb(positions) END)
);
