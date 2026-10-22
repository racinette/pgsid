-- @world checks
CREATE TYPE inspection_reading AS (score integer, label text COLLATE "C", span int4range);
CREATE TYPE inspection_packet AS (current_reading inspection_reading, previous_reading inspection_reading, history inspection_reading[]);
CREATE TABLE inspection_reports (
  packet inspection_packet,
  backup inspection_packet,
  expected_null boolean,
  expected_present boolean,
  use_primary boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT reading_score CHECK (CASE WHEN bypass THEN true ELSE (packet).current_reading.score >= 2 END),
  CONSTRAINT reading_label CHECK (CASE WHEN bypass THEN true ELSE length((packet).current_reading.label) >= 2 END),
  CONSTRAINT reading_window CHECK (CASE WHEN bypass THEN true ELSE lower((packet).current_reading.span) <= 10 END),
  CONSTRAINT history_score CHECK (CASE WHEN bypass THEN true ELSE ((packet).history[1]).score >= 2 END),
  CONSTRAINT packet_null CHECK (CASE WHEN bypass THEN true ELSE (packet IS NULL) = expected_null END),
  CONSTRAINT packet_present CHECK (CASE WHEN bypass THEN true ELSE (packet IS NOT NULL) = expected_present END),
  CONSTRAINT fallback_score CHECK (CASE WHEN bypass THEN true ELSE (COALESCE(packet, backup)).current_reading.score >= 2 END),
  CONSTRAINT selected_score CHECK (CASE WHEN bypass THEN true ELSE (CASE WHEN use_primary THEN packet ELSE backup END).current_reading.score >= 2 END)
);

CREATE TYPE draft_reading AS (score smallint, obsolete_code integer, label varchar(3) COLLATE "C");
ALTER TYPE draft_reading DROP ATTRIBUTE obsolete_code;
CREATE DOMAIN approved_draft AS draft_reading NOT NULL
  CHECK ((VALUE).score IS NULL OR (VALUE).score >= 0);
CREATE TABLE inspection_drafts (
  score integer,
  label text,
  denominator integer,
  minimum_score integer,
  expected_null boolean,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT draft_score CHECK (CASE WHEN bypass THEN true ELSE (ROW(score, label)::draft_reading).score >= minimum_score END),
  CONSTRAINT draft_label CHECK (CASE WHEN bypass THEN true ELSE length((ROW(score / denominator, label)::draft_reading).label) <= 3 END),
  CONSTRAINT draft_null CHECK (CASE WHEN bypass THEN true ELSE (ROW(score, label)::draft_reading IS NULL) = expected_null END),
  CONSTRAINT draft_present CHECK (CASE WHEN bypass THEN true ELSE (ROW(score, label)::draft_reading IS NOT NULL) = expected_present END),
  CONSTRAINT draft_approval CHECK (CASE WHEN bypass THEN true ELSE (ROW(score, label)::approved_draft).score >= minimum_score END),
  CONSTRAINT draft_fallback CHECK (CASE WHEN bypass THEN true ELSE (COALESCE(ROW(NULL,NULL)::draft_reading,ROW(score,label)::draft_reading)).score IS NULL END)
);

CREATE TABLE stored_inspections (
  draft approved_draft,
  expected_null boolean,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT stored_null CHECK (CASE WHEN bypass THEN true ELSE (draft IS NULL) = expected_null END),
  CONSTRAINT stored_present CHECK (CASE WHEN bypass THEN true ELSE (draft IS NOT NULL) = expected_present END),
  CONSTRAINT stored_datum CHECK (CASE WHEN bypass THEN true ELSE draft IS DISTINCT FROM NULL END)
);

CREATE TABLE inspection_imports (
  record_text text,
  canonical_text text,
  minimum_score integer,
  expected_null boolean,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT imported_approval CHECK (CASE WHEN bypass THEN true ELSE (record_text::approved_draft).score >= minimum_score END),
  CONSTRAINT imported_text CHECK (CASE WHEN bypass THEN true ELSE (record_text::draft_reading)::text COLLATE "C" IS NOT DISTINCT FROM canonical_text COLLATE "C" END),
  CONSTRAINT imported_null CHECK (CASE WHEN bypass THEN true ELSE (record_text::draft_reading IS NULL) = expected_null END),
  CONSTRAINT imported_present CHECK (CASE WHEN bypass THEN true ELSE (record_text::draft_reading IS NOT NULL) = expected_present END),
  CONSTRAINT imported_literal CHECK (CASE WHEN bypass THEN true ELSE ('(2,abc)'::draft_reading).score >= minimum_score END)
);

CREATE TABLE inspection_comparisons (
  current_reading inspection_reading,
  previous_reading inspection_reading,
  expected_order integer,
  expected_equal boolean,
  expected_distinct boolean NOT NULL,
  expected_retained boolean NOT NULL,
  expected_greatest_current boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT compared_equal CHECK (CASE WHEN bypass THEN true ELSE (current_reading = previous_reading) IS NOT DISTINCT FROM expected_equal END),
  CONSTRAINT compared_order CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.btrecordcmp(current_reading, previous_reading) IS NOT DISTINCT FROM expected_order END),
  CONSTRAINT compared_less CHECK (CASE WHEN bypass THEN true ELSE (current_reading < previous_reading) IS NOT DISTINCT FROM (expected_order < 0) END),
  CONSTRAINT compared_greater_equal CHECK (CASE WHEN bypass THEN true ELSE (current_reading >= previous_reading) IS NOT DISTINCT FROM (expected_order >= 0) END),
  CONSTRAINT compared_distinct CHECK (CASE WHEN bypass THEN true ELSE (current_reading IS DISTINCT FROM previous_reading) = expected_distinct END),
  CONSTRAINT compared_retained CHECK (CASE WHEN bypass THEN true ELSE (NULLIF(current_reading, previous_reading) IS DISTINCT FROM NULL) = expected_retained END),
  CONSTRAINT compared_greatest CHECK (CASE WHEN bypass THEN true ELSE (GREATEST(current_reading, previous_reading) IS NOT DISTINCT FROM current_reading) = expected_greatest_current END)
);

CREATE TABLE inspection_batches (
  readings draft_reading[],
  previous_readings draft_reading[],
  encoded text,
  canonical_text text,
  expected_count integer,
  expected_equal boolean,
  expected_order integer,
  bypass boolean NOT NULL,
  CONSTRAINT batch_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(readings) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT batch_equal CHECK (CASE WHEN bypass THEN true ELSE (readings = previous_readings) IS NOT DISTINCT FROM expected_equal END),
  CONSTRAINT batch_order CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.btarraycmp(readings, previous_readings) IS NOT DISTINCT FROM expected_order END),
  CONSTRAINT batch_score CHECK (CASE WHEN bypass THEN true ELSE (readings[1]).score >= 0 END),
  CONSTRAINT batch_output CHECK (CASE WHEN bypass THEN true ELSE readings::text IS NOT DISTINCT FROM canonical_text END),
  CONSTRAINT batch_input CHECK (CASE WHEN bypass THEN true ELSE encoded::draft_reading[] IS NOT DISTINCT FROM readings END)
);

CREATE TABLE inspection_approved_batches (
  readings approved_draft[],
  encoded text,
  canonical_text text,
  expected_count integer,
  minimum_score integer,
  bypass boolean NOT NULL,
  CONSTRAINT approved_batch_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(readings) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT approved_batch_score CHECK (CASE WHEN bypass THEN true ELSE (readings[1]).score >= minimum_score END),
  CONSTRAINT approved_batch_output CHECK (CASE WHEN bypass THEN true ELSE readings::text IS NOT DISTINCT FROM canonical_text END),
  CONSTRAINT approved_batch_input CHECK (CASE WHEN bypass THEN true ELSE encoded::approved_draft[] IS NOT DISTINCT FROM readings END)
);

CREATE DOMAIN inspection_batch AS approved_draft[] NOT NULL CHECK(cardinality(VALUE)>0);
CREATE TABLE inspection_nested_batches (
  batches inspection_batch[],
  encoded text,
  canonical_text text,
  expected_count integer,
  minimum_score integer,
  bypass boolean NOT NULL,
  CONSTRAINT nested_batch_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(batches) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT nested_batch_score CHECK (CASE WHEN bypass THEN true ELSE ((batches[1])[1]).score >= minimum_score END),
  CONSTRAINT nested_batch_output CHECK (CASE WHEN bypass THEN true ELSE batches::text IS NOT DISTINCT FROM canonical_text END),
  CONSTRAINT nested_batch_input CHECK (CASE WHEN bypass THEN true ELSE encoded::inspection_batch[] IS NOT DISTINCT FROM batches END)
);

CREATE TYPE inspection_band AS RANGE(subtype=draft_reading);
CREATE TYPE inspection_bounds AS(reading_band inspection_band);
CREATE TYPE inspection_envelope AS RANGE(subtype=inspection_bounds);
CREATE TABLE inspection_bands (
  reading_band inspection_band,
  previous_band inspection_band,
  encoded text,
  canonical_text text,
  minimum_score integer,
  expected_order integer,
  expected_equal boolean,
  bypass boolean NOT NULL,
  CONSTRAINT band_score CHECK (CASE WHEN bypass THEN true ELSE (lower(reading_band)).score >= minimum_score END),
  CONSTRAINT band_order CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.range_cmp(reading_band,previous_band) IS NOT DISTINCT FROM expected_order END),
  CONSTRAINT band_equal CHECK (CASE WHEN bypass THEN true ELSE (reading_band=previous_band) IS NOT DISTINCT FROM expected_equal END),
  CONSTRAINT band_output CHECK (CASE WHEN bypass THEN true ELSE reading_band::text IS NOT DISTINCT FROM canonical_text END),
  CONSTRAINT band_input CHECK (CASE WHEN bypass THEN true ELSE encoded::inspection_band IS NOT DISTINCT FROM reading_band END),
  CONSTRAINT band_literal CHECK (CASE WHEN bypass THEN true ELSE (lower('["(2,abc)",)'::inspection_band)).score >= minimum_score END),
  CONSTRAINT band_constructed CHECK (CASE WHEN bypass THEN true ELSE inspection_band(lower(reading_band),upper(reading_band),'[]') @> reading_band END),
  CONSTRAINT band_envelope CHECK (CASE WHEN bypass THEN true ELSE inspection_envelope(ROW(reading_band)::inspection_bounds,NULL) @> ROW(previous_band)::inspection_bounds END),
  CONSTRAINT envelope_output CHECK (CASE WHEN bypass THEN true ELSE length(inspection_envelope(ROW(reading_band)::inspection_bounds,NULL)::text)>0 END)
);

CREATE TABLE inspection_documents (
  packet inspection_packet,
  expected_text text,
  expected_document jsonb,
  pretty boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT document_text CHECK (CASE WHEN bypass THEN true ELSE row_to_json(packet,pretty)::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT document_normalized CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(packet) IS NOT DISTINCT FROM expected_document END)
);

CREATE TABLE inspection_projections (
  score integer,
  label text,
  expected_document jsonb,
  detailed boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT projected_document CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(CASE WHEN detailed THEN ROW(score,label) ELSE ROW(label) END) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT projected_score CHECK (CASE WHEN bypass THEN true ELSE (to_jsonb(ARRAY[ROW(score),ROW(label)])#>>'{0,f1}')::int4>=0 END)
);

CREATE TABLE inspection_hashes (
  draft draft_reading,
  seed bigint,
  expected_hash integer,
  expected_extended bigint,
  expected_batch integer,
  bypass boolean NOT NULL,
  CONSTRAINT draft_hash CHECK (CASE WHEN bypass THEN true ELSE hash_record(draft) IS NOT DISTINCT FROM expected_hash END),
  CONSTRAINT draft_hash_extended CHECK (CASE WHEN bypass THEN true ELSE hash_record_extended(draft,seed) IS NOT DISTINCT FROM expected_extended END),
  CONSTRAINT draft_batch_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array(ARRAY[draft,NULL::draft_reading]) IS NOT DISTINCT FROM expected_batch END)
);

CREATE TYPE vacant_inspection AS();
CREATE TABLE inspection_frames (
  vacant vacant_inspection,
  expected bytea,
  expected_length integer,
  use_primary boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT frame_bytes CHECK (CASE WHEN bypass THEN true ELSE record_send(vacant) IS NOT DISTINCT FROM expected END),
  CONSTRAINT frame_length CHECK (CASE WHEN bypass THEN true ELSE octet_length(record_send(vacant)) IS NOT DISTINCT FROM expected_length END),
  CONSTRAINT selected_frame CHECK (CASE WHEN bypass THEN true ELSE record_send(CASE WHEN use_primary THEN vacant ELSE ROW()::vacant_inspection END) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE inspection_expansions (
  score integer,
  label text COLLATE "C",
  minimum_score integer,
  expected_document jsonb,
  expected_label text COLLATE "C",
  bypass boolean NOT NULL,
  CONSTRAINT expansion_score CHECK (CASE WHEN bypass THEN true ELSE (ROW(score,label)).f1>=minimum_score END),
  CONSTRAINT expansion_document CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(ROW((ROW(score,label)::draft_reading).*)) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT expansion_label CHECK (CASE WHEN bypass THEN true ELSE (ROW((ROW(score,label)::draft_reading).*)::draft_reading).label IS NOT DISTINCT FROM expected_label END),
  CONSTRAINT expansion_owner CHECK (CASE WHEN bypass THEN true ELSE (to_jsonb(ROW(inspection_expansions.*))->>'f1')::int4 IS NOT DISTINCT FROM minimum_score END)
);

CREATE TYPE inspection_display AS(score integer, to_jsonb text COLLATE "C", labels text[]);
CREATE TABLE inspection_field_calls (
  reading inspection_display,
  expected_score integer,
  expected_label text COLLATE "C",
  expected_document jsonb,
  expected_count integer,
  bypass boolean NOT NULL,
  CONSTRAINT call_score CHECK (CASE WHEN bypass THEN true ELSE score(reading) IS NOT DISTINCT FROM expected_score END),
  CONSTRAINT call_document CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(reading) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT call_field CHECK (CASE WHEN bypass THEN true ELSE (reading).to_jsonb IS NOT DISTINCT FROM expected_label END),
  CONSTRAINT call_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(labels(reading)) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT call_anonymous CHECK (CASE WHEN bypass THEN true ELSE f1(ROW(expected_score,reading)) IS NOT DISTINCT FROM score(reading) END)
);

CREATE TABLE inspection_origins (
  score integer,
  label text COLLATE "C",
  CONSTRAINT origin_score CHECK(score>=0)
);
CREATE TABLE inspection_extensions (
  sequence integer,
  label text COLLATE "C",
  score integer,
  retained boolean,
  CONSTRAINT origin_score CHECK(score>=0)
);
ALTER TABLE inspection_extensions INHERIT inspection_origins;
CREATE TABLE inspection_inherited_values (
  reading inspection_extensions,
  minimum_score integer,
  expected_label text COLLATE "C",
  expected_document jsonb,
  bypass boolean NOT NULL,
  CONSTRAINT ancestor_score CHECK(CASE WHEN bypass THEN true ELSE (reading::inspection_origins).score>=minimum_score END),
  CONSTRAINT ancestor_label CHECK(CASE WHEN bypass THEN true ELSE (reading::inspection_origins).label IS NOT DISTINCT FROM expected_label END),
  CONSTRAINT ancestor_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(reading::inspection_origins) IS NOT DISTINCT FROM expected_document END)
);

CREATE TABLE inspection_whole_rows (
  score integer,
  obsolete integer,
  label text COLLATE "C",
  minimum_score integer,
  expected_present boolean,
  bypass boolean NOT NULL
);
ALTER TABLE inspection_whole_rows DROP COLUMN obsolete;
ALTER TABLE inspection_whole_rows ADD CONSTRAINT whole_score CHECK(CASE WHEN bypass THEN true ELSE (to_jsonb(inspection_whole_rows)->>'score')::integer>=minimum_score END);
ALTER TABLE inspection_whole_rows ADD CONSTRAINT whole_present CHECK(CASE WHEN bypass THEN true ELSE (inspection_whole_rows IS NOT NULL) IS NOT DISTINCT FROM expected_present END);
ALTER TABLE inspection_whole_rows ADD CONSTRAINT whole_datum CHECK(inspection_whole_rows.* IS DISTINCT FROM NULL);

CREATE TABLE inspection_named_rows (
  inspection_named_rows integer,
  score integer,
  minimum_score integer,
  bypass boolean NOT NULL,
  CONSTRAINT named_scalar CHECK(CASE WHEN bypass THEN true ELSE (to_jsonb(inspection_named_rows)#>>'{}')::integer>=0 END),
  CONSTRAINT named_whole CHECK(CASE WHEN bypass THEN true ELSE (to_jsonb(inspection_named_rows.*)->>'score')::integer>=minimum_score END)
);

CREATE TABLE inspection_common_values (
  reading inspection_extensions,
  fallback inspection_origins,
  readings inspection_origins[],
  minimum_score integer,
  expected_document jsonb,
  expected_batch jsonb,
  bypass boolean NOT NULL,
  CONSTRAINT common_score CHECK(CASE WHEN bypass THEN true ELSE (COALESCE(reading,fallback)).score>=minimum_score END),
  CONSTRAINT common_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(CASE WHEN reading IS DISTINCT FROM NULL THEN reading ELSE fallback END) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT common_batch CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(array_append(readings,reading)) IS NOT DISTINCT FROM expected_batch END)
);
