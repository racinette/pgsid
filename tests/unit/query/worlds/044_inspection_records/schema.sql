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
