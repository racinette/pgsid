-- @world checks
CREATE TYPE catalog_layout AS (positions int2vector, type_ids oidvector);

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
