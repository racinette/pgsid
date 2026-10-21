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
