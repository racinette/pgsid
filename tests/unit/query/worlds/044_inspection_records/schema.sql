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

CREATE TYPE inspection_reading_kind AS (
  score integer,
  label text COLLATE "C",
  approved boolean,
  bypass boolean
);
CREATE TABLE inspection_typed_readings OF inspection_reading_kind;
ALTER TABLE inspection_typed_readings ADD CONSTRAINT typed_reading_score CHECK(CASE WHEN bypass THEN true ELSE (inspection_typed_readings::inspection_reading_kind).score>=0 END);
ALTER TABLE inspection_typed_readings ADD CONSTRAINT typed_reading_approval CHECK(CASE WHEN bypass THEN true ELSE (inspection_typed_readings::inspection_reading_kind).approved END);

CREATE TABLE inspection_typed_batches (
  reading inspection_typed_readings,
  fallback inspection_reading_kind,
  minimum_score integer,
  expected_batch jsonb,
  bypass boolean NOT NULL,
  CONSTRAINT typed_common_score CHECK(CASE WHEN bypass THEN true ELSE (COALESCE(reading,fallback)).score>=minimum_score END),
  CONSTRAINT typed_batch_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[reading,fallback]) IS NOT DISTINCT FROM expected_batch END)
);

CREATE TYPE inspection_import_fields AS (
  score text,
  label text,
  approved text,
  bypass text
);
CREATE CAST (inspection_import_fields AS inspection_reading_kind) WITH INOUT AS IMPLICIT;
CREATE TABLE inspection_import_batches (
  reading inspection_import_fields,
  fallback inspection_reading_kind,
  minimum_score integer,
  expected_batch jsonb,
  bypass boolean NOT NULL,
  CONSTRAINT imported_common_score CHECK(CASE WHEN bypass THEN true ELSE (COALESCE(reading,fallback)).score>=minimum_score END),
  CONSTRAINT imported_batch_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[reading,fallback]) IS NOT DISTINCT FROM expected_batch END)
);

CREATE CAST (inspection_extensions AS inspection_origins) WITH INOUT;
CREATE TABLE inspection_record_rechecks (
  reading inspection_extensions,
  minimum_score integer,
  expected_empty boolean,
  bypass boolean NOT NULL,
  CONSTRAINT rechecked_score CHECK(CASE WHEN bypass THEN true ELSE (reading::inspection_origins).score>=minimum_score END),
  CONSTRAINT rechecked_empty CHECK(CASE WHEN bypass THEN true ELSE (reading IS NULL) IS NOT DISTINCT FROM expected_empty END)
);


CREATE TABLE inspection_mixed_conversions (
  reading inspection_extensions,
  fallback inspection_origins,
  minimum_score integer,
  expected_document jsonb,
  use_text boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT mixed_conversion_score CHECK(CASE WHEN bypass THEN true ELSE (CASE WHEN use_text THEN reading::inspection_origins ELSE COALESCE(reading,fallback) END).score>=minimum_score END),
  CONSTRAINT mixed_conversion_document CHECK(CASE WHEN bypass THEN true ELSE (CASE WHEN use_text THEN to_jsonb(reading::inspection_origins) ELSE to_jsonb(COALESCE(reading,fallback)) END) IS NOT DISTINCT FROM expected_document END)
);

CREATE TABLE inspection_anonymous_comparisons (
 n integer,
 m integer,
 label text,
 other_label text,
 divisor integer,
 pick_number boolean,
 expected_equal boolean,
 expected_order integer,
 expected_selected boolean,
 expected_arithmetic boolean,
 bypass boolean NOT NULL,
 CONSTRAINT anonymous_equal CHECK(CASE WHEN bypass THEN true ELSE pg_catalog.record_eq(ROW(n,label COLLATE "C"),ROW(m,other_label COLLATE "C")) IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT anonymous_order CHECK(CASE WHEN bypass THEN true ELSE pg_catalog.btrecordcmp(ROW(n,label COLLATE "C"),ROW(m,other_label COLLATE "C")) IS NOT DISTINCT FROM expected_order END),
 CONSTRAINT anonymous_selected CHECK(CASE WHEN bypass THEN true ELSE pg_catalog.record_eq(CASE WHEN pick_number THEN ROW(n) ELSE ROW(label) END,CASE WHEN pick_number THEN ROW(m) ELSE ROW(other_label) END) IS NOT DISTINCT FROM expected_selected END),
 CONSTRAINT anonymous_array CHECK(CASE WHEN bypass THEN true ELSE (ARRAY[ROW(n,label COLLATE "C")]=ARRAY[ROW(m,other_label COLLATE "C")]) IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT anonymous_arithmetic CHECK(CASE WHEN bypass THEN true ELSE pg_catalog.record_eq(ROW(n,1/divisor),ROW(m,1)) IS NOT DISTINCT FROM expected_arithmetic END),
 CONSTRAINT anonymous_any CHECK(CASE WHEN bypass THEN true ELSE ROW(n,label COLLATE "C")=ANY(ARRAY[ROW(m,other_label COLLATE "C"),ROW(n,label COLLATE "C")]) END),
 CONSTRAINT anonymous_all CHECK(CASE WHEN bypass THEN true ELSE (ROW(n,label COLLATE "C")=ALL(ARRAY[ROW(m,other_label COLLATE "C")])) IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT anonymous_position CHECK(CASE WHEN bypass THEN true ELSE array_position(ARRAY[ROW(m,other_label COLLATE "C"),ROW(n,label COLLATE "C")],ROW(n,label COLLATE "C"))=CASE WHEN expected_equal THEN 1 ELSE 2 END END),
 CONSTRAINT anonymous_sort_shape CHECK(CASE WHEN bypass THEN true ELSE cardinality(array_sort(ARRAY[ROW(n,label COLLATE "C"),ROW(m,other_label COLLATE "C")]))=2 END),
 CONSTRAINT anonymous_sort_values CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(array_sort(ARRAY[ROW(n,label COLLATE "C"),ROW(n,label COLLATE "C")]))=jsonb_build_array(jsonb_build_object('f1',n,'f2',label),jsonb_build_object('f1',n,'f2',label)) END),
 CONSTRAINT anonymous_bucket CHECK(CASE WHEN bypass THEN true ELSE width_bucket(ROW(n),ARRAY[ROW(m)])=CASE WHEN n IS NULL THEN 1 WHEN m IS NULL THEN 0 WHEN n<m THEN 0 ELSE 1 END END),
 CONSTRAINT anonymous_empty CHECK(CASE WHEN bypass THEN true ELSE NOT(ROW(n)=ANY(ARRAY[]::record[])) END)
);

CREATE TABLE inspection_record_inputs (
  source_record text,
  expected_document jsonb,
  expected_dimensions text,
  expected_array_text text,
  score integer,
  label text,
  expected_row_text text,
  bypass boolean NOT NULL,
  CONSTRAINT record_input_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(source_record::record[]) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT record_input_dimensions CHECK(CASE WHEN bypass THEN true ELSE array_dims(source_record::record[]) IS NOT DISTINCT FROM expected_dimensions END),
  CONSTRAINT record_input_output CHECK(CASE WHEN bypass THEN true ELSE (source_record::record[])::text IS NOT DISTINCT FROM expected_array_text END),
  CONSTRAINT record_alias_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb((ROW(score,label)::draft_reading)::record)=jsonb_build_object('score',score,'label',label) END),
  CONSTRAINT record_array_output CHECK(CASE WHEN bypass THEN true ELSE ARRAY[ROW(score,label)]::text IS NOT DISTINCT FROM expected_row_text END),
  CONSTRAINT record_unknown_output CHECK(CASE WHEN bypass THEN true ELSE ARRAY[ROW(score,'constant',NULL)]::text IS NOT NULL END)
);

CREATE TABLE inspection_generic_arrays (
  score integer,
  alternate_score integer,
  label text,
  expected_document jsonb,
  expected_sorted jsonb,
  expected_text text,
  extended_requested boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT generic_array_document CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[ROW(score,label)::draft_reading]::record[]) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT generic_array_output CHECK(CASE WHEN bypass THEN true ELSE (ARRAY[ROW(score,label)::draft_reading]::record[])::text IS NOT DISTINCT FROM expected_text END),
  CONSTRAINT generic_array_sort CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(array_sort(ARRAY[ROW(score,label)::draft_reading,ROW(alternate_score,label)::draft_reading]::record[])) IS NOT DISTINCT FROM expected_sorted END),
  CONSTRAINT generic_array_equal CHECK(CASE WHEN bypass THEN true ELSE record_eq((ARRAY[ROW(score,label)::draft_reading]::record[])[1],ROW(score::smallint,label::varchar(3) COLLATE "C")) END),
  CONSTRAINT generic_array_extended CHECK(CASE WHEN bypass THEN true WHEN extended_requested THEN hash_array_extended(ARRAY[ROW(score,label)::draft_reading]::record[],0)=0 ELSE true END)
);

CREATE TYPE historical_reading AS (score integer, obsolete_ratio integer);
CREATE TABLE inspection_historical_rows (
  score integer,
  denominator integer,
  expected_present boolean,
  expected_text text,
  bypass boolean NOT NULL,
  CONSTRAINT historical_present CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score, score / denominator)::historical_reading IS NOT NULL) = expected_present END),
  CONSTRAINT historical_text CHECK (CASE WHEN bypass THEN true ELSE
    ROW(score, score / denominator)::historical_reading::text = expected_text END)
);
ALTER TYPE historical_reading DROP ATTRIBUTE obsolete_ratio;

CREATE TYPE historical_caption AS (score integer, obsolete_caption text);
CREATE TABLE inspection_historical_captions (
  score integer,
  label text COLLATE "C",
  expected_present boolean,
  expected_document jsonb,
  bypass boolean NOT NULL,
  CONSTRAINT caption_present CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score, CASE WHEN lower(label COLLATE "C") = 'red' THEN NULL::text ELSE label END)::historical_caption IS NOT NULL) = expected_present END),
  CONSTRAINT caption_document CHECK (CASE WHEN bypass THEN true ELSE
    to_jsonb(ROW(score, label::int4)::historical_caption) = expected_document END)
);
ALTER TYPE historical_caption DROP ATTRIBUTE obsolete_caption;

CREATE TYPE historical_comparison_reading AS (score integer, obsolete_ratio integer, label varchar(2) COLLATE "C");
CREATE TABLE inspection_comparison_history (
  score integer,
  alternate_score integer,
  denominator integer,
  label text COLLATE "C",
  reference_label text COLLATE "C",
  expected_distinct boolean,
  expected_member boolean,
  bypass boolean NOT NULL,
  CONSTRAINT comparison_difference CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,score/denominator,label)::historical_comparison_reading IS DISTINCT FROM
      ROW(alternate_score,alternate_score/denominator,reference_label)::historical_comparison_reading) = expected_distinct END),
  CONSTRAINT comparison_membership CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,score/denominator,label)::historical_comparison_reading IN
      (ROW(alternate_score,alternate_score/denominator,reference_label)::historical_comparison_reading,
       ROW(0,1,'ab')::historical_comparison_reading)) = expected_member END)
);
ALTER TYPE historical_comparison_reading DROP ATTRIBUTE obsolete_ratio;
DROP TYPE historical_comparison_reading;

CREATE TYPE historical_rounded_reading AS (score integer, obsolete_amount integer);
CREATE TYPE historical_decimal_reading AS (score integer, obsolete_amount numeric);
CREATE TABLE inspection_numeric_history (
  score integer,
  alternate_score integer,
  denominator integer,
  fractional boolean NOT NULL,
  expected_distinct boolean NOT NULL,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT numeric_history_difference CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN fractional THEN 1.2500 ELSE 1.0000 END)::historical_rounded_reading IS DISTINCT FROM
      ROW(alternate_score,CASE WHEN fractional THEN 1.2500 ELSE 1.0000 END)::historical_decimal_reading) = expected_distinct END),
  CONSTRAINT numeric_history_presence CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,scale(1.2500)/denominator)::historical_rounded_reading IS NOT NULL) = expected_present END)
);
ALTER TYPE historical_rounded_reading DROP ATTRIBUTE obsolete_amount;
ALTER TYPE historical_decimal_reading DROP ATTRIBUTE obsolete_amount;

CREATE TYPE historical_float_reading AS (score integer, obsolete_ratio integer);
CREATE TABLE inspection_float_history (
  score integer,
  denominator integer,
  expected_nan bytea,
  expected_present boolean,
  expected_zero_present boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT float_history_nan CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN float8send('NaN'::float8)=expected_nan THEN 1/denominator ELSE NULL::integer END)::historical_float_reading IS NOT NULL) = expected_present END),
  CONSTRAINT float_history_zero CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN get_byte(float8send('-0'::float8),0)=128 THEN 1/denominator ELSE NULL::integer END)::historical_float_reading IS NOT NULL) = expected_zero_present END)
);
ALTER TYPE historical_float_reading DROP ATTRIBUTE obsolete_ratio;

CREATE TYPE historical_temporal_reading AS (score integer, obsolete_ratio integer);
CREATE TABLE inspection_temporal_history (
  score integer,
  denominator integer,
  expected_instant bytea,
  expected_duration bytea,
  expected_instant_present boolean NOT NULL,
  expected_duration_present boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT temporal_history_instant CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN timestamptz_send(TIMESTAMPTZ '2001-02-03 04:05:06.123456+03:02')=expected_instant
      AND get_byte(date_send(DATE '2000-01-02'),3)=1
      AND get_byte(timestamp_send(TIMESTAMP '2000-01-01 00:00:00.000001'),7)=1
      THEN 1/denominator ELSE NULL::integer END)::historical_temporal_reading IS NOT NULL) = expected_instant_present END),
  CONSTRAINT temporal_history_duration CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN interval_send(INTERVAL '-1 month 2 days -03:04:05.000006')=expected_duration
      AND get_byte(time_send(TIME '00:00:00.000001'),7)=1
      AND get_byte(timetz_send(TIMETZ '00:00:00+00:00:01'),11)=255
      THEN 1/denominator ELSE NULL::integer END)::historical_temporal_reading IS NOT NULL) = expected_duration_present END)
);
ALTER TYPE historical_temporal_reading DROP ATTRIBUTE obsolete_ratio;

CREATE TYPE historical_binary_reading AS (score integer, obsolete_ratio integer);
CREATE TABLE inspection_binary_history (
  score integer,
  denominator integer,
  payload bytea,
  identity_uuid uuid,
  expected_payload_present boolean NOT NULL,
  expected_identity_present boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT binary_history_payload CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN payload='\x000180ff'::bytea
      AND get_byte('\x000180ff'::bytea,3)=255 AND octet_length('\x000180ff'::bytea)=4
      THEN 1/denominator ELSE NULL::integer END)::historical_binary_reading IS NOT NULL) = expected_payload_present END),
  CONSTRAINT binary_history_identity CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN identity_uuid='01234567-89ab-cdef-8012-3456789abcde'::uuid
      AND uuid_send('01234567-89ab-cdef-8012-3456789abcde'::uuid)='\x0123456789abcdef80123456789abcde'::bytea
      THEN 1/denominator ELSE NULL::integer END)::historical_binary_reading IS NOT NULL) = expected_identity_present END)
);
ALTER TYPE historical_binary_reading DROP ATTRIBUTE obsolete_ratio;

CREATE TYPE historical_address_reading AS (score integer, obsolete_ratio integer);
CREATE TABLE inspection_address_history (
  score integer,
  denominator integer,
  ip_address inet,
  hardware macaddr8,
  flags varbit,
  expected_network_present boolean NOT NULL,
  expected_flags_present boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT address_history_network CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN ip_address <<= CIDR '192.0.2.0/24'
      AND inet_send(INET '192.0.2.129/24')='\x02180004c0000281'::bytea
      AND get_byte(cidr_send(CIDR '2001:db8::/32'),1)=32
      THEN 1/denominator ELSE NULL::integer END)::historical_address_reading IS NOT NULL) = expected_network_present END),
  CONSTRAINT address_history_flags CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN hardware=MACADDR8 '08:00:2b:ff:fe:01:02:03'
      AND macaddr_send(MACADDR '08:00:2b:01:02:03')='\x08002b010203'::bytea
      AND get_bit(flags,0)=1 AND bit_send(B'10101')='\x00000005a8'::bytea
      AND varbit_send(B'101010101'::varbit)='\x00000009aa80'::bytea
      THEN 1/denominator ELSE NULL::integer END)::historical_address_reading IS NOT NULL) = expected_flags_present END)
);
ALTER TYPE historical_address_reading DROP ATTRIBUTE obsolete_ratio;

CREATE TYPE historical_flag_reading AS (score integer, flags bit(5));
CREATE TYPE historical_amount_reading AS (score integer, amount numeric(4,2));
CREATE TYPE historical_capture_reading AS (score integer, captured timestamp(2));
CREATE TYPE historical_flag_batch AS (score integer, flags bit(5)[]);
CREATE TABLE inspection_modifier_history (
  score integer,
  flags_text text,
  amount_text text,
  captured_text text,
  expected_flags bytea NOT NULL,
  expected_amount bytea NOT NULL,
  expected_capture bytea NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT modifier_history_flags CHECK (CASE WHEN bypass THEN true ELSE
    bit_send((ROW(score,flags_text::varbit)::historical_flag_reading).flags)=expected_flags END),
  CONSTRAINT modifier_history_amount CHECK (CASE WHEN bypass THEN true ELSE
    numeric_send((ROW(score,amount_text::numeric)::historical_amount_reading).amount)=expected_amount END),
  CONSTRAINT modifier_history_capture CHECK (CASE WHEN bypass THEN true ELSE
    timestamp_send((ROW(score,captured_text::timestamp)::historical_capture_reading).captured)=expected_capture END),
  CONSTRAINT modifier_history_batch CHECK (CASE WHEN bypass THEN true ELSE
    bit_send(((ROW(score,ARRAY[flags_text::varbit])::historical_flag_batch).flags)[1])=expected_flags END)
);
ALTER TYPE historical_flag_reading ALTER ATTRIBUTE flags TYPE bit(6);
ALTER TYPE historical_amount_reading ALTER ATTRIBUTE amount TYPE numeric(6,3);
ALTER TYPE historical_capture_reading ALTER ATTRIBUTE captured TYPE timestamp(4);
ALTER TYPE historical_flag_batch ALTER ATTRIBUTE flags TYPE bit(6)[];

CREATE TYPE historical_array_reading AS (score integer, obsolete_values integer[]);
CREATE TYPE historical_array_conversion AS (score integer, obsolete_values smallint[]);
CREATE TYPE historical_array_shape AS (score integer, obsolete_values integer[]);
CREATE TABLE inspection_array_history (
  score integer,
  divisor integer NOT NULL,
  label text NOT NULL,
  expected_present boolean,
  expected_converted boolean,
  expected_shape boolean,
  bypass boolean NOT NULL,
  CONSTRAINT array_history_present CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,ARRAY[score/divisor,NULL])::historical_array_reading IS NOT NULL)=expected_present END),
  CONSTRAINT array_history_converted CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,(CASE WHEN divisor>=0 THEN ARRAY[label] ELSE ARRAY['0'::text] END)::smallint[])::historical_array_conversion IS NOT NULL)=expected_converted END),
  CONSTRAINT array_history_shape CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,ARRAY[ARRAY[score/divisor],CASE WHEN divisor=2 THEN ARRAY[1,2] ELSE ARRAY[1] END])::historical_array_shape IS NOT NULL)=expected_shape END)
);
ALTER TYPE historical_array_reading DROP ATTRIBUTE obsolete_values;
ALTER TYPE historical_array_conversion DROP ATTRIBUTE obsolete_values;
ALTER TYPE historical_array_shape DROP ATTRIBUTE obsolete_values;

CREATE DOMAIN historical_positive AS integer CHECK (VALUE > 0);
CREATE TYPE historical_phase AS ENUM ('z','','a');
CREATE TYPE historical_constant_reading AS (score integer, obsolete_values historical_positive[]);
CREATE TYPE historical_constant_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_array_constants (
  score integer,
  divisor integer NOT NULL,
  expected_present boolean,
  expected_match boolean,
  expected_matrix text,
  expected_phase text,
  bypass boolean NOT NULL,
  CONSTRAINT constant_history_domain CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,'[0:2]={1,2,NULL}'::historical_positive[])::historical_constant_reading IS NOT NULL)=expected_present END),
  CONSTRAINT constant_history_matrix CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN '[-1:0][2:3]={{1,NULL},{2,3}}'::integer[]::text COLLATE "C"=expected_matrix
      THEN 1/divisor ELSE NULL::integer END)::historical_constant_result IS NOT NULL)=expected_match END),
  CONSTRAINT constant_history_phase CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN '{z,"",NULL}'::historical_phase[]::text COLLATE "C"=expected_phase
      THEN 1/divisor ELSE NULL::integer END)::historical_constant_result IS NOT NULL)=expected_match END)
);
ALTER DOMAIN historical_positive ADD CONSTRAINT historical_positive_tighter CHECK (VALUE > 2) NOT VALID;
ALTER TYPE historical_phase RENAME VALUE 'z' TO 'middle';
ALTER TYPE historical_constant_reading DROP ATTRIBUTE obsolete_values;
ALTER TYPE historical_constant_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_json_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_json_history (
  score integer,
  divisor integer NOT NULL,
  label text,
  expected_source text,
  expected_document text,
  expected_field text,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT json_history_source CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN ' { "a":1, "a":2.4500,"é":"😊" } '::json::text COLLATE "C"=expected_source
      THEN 1/divisor ELSE NULL::integer END)::historical_json_result IS NOT NULL)=expected_present END),
  CONSTRAINT json_history_document CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN '{"b":[true,null],"a":1.2300,"é":"😊"}'::jsonb::text COLLATE "C"=expected_document
      AND jsonb_path_exists('{"b":[true,null]}'::jsonb,'$.b[*] ? (@ == true)'::jsonpath,'{}'::jsonb,false)
      AND jsonb_send('{"n":1.2300}'::jsonb)='\x017b226e223a20312e323330307d'::bytea
      THEN 1/divisor ELSE NULL::integer END)::historical_json_result IS NOT NULL)=expected_present END),
  CONSTRAINT json_history_field CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN ('{"a":1.2300,"é":"😊"}'::jsonb->>label) COLLATE "C"=expected_field
      THEN 1/divisor ELSE NULL::integer END)::historical_json_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_json_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_default_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_default_history (
  score integer,
  divisor integer NOT NULL,
  document jsonb,
  path jsonpath,
  expected_present boolean,
  expected_exists boolean,
  expected_max integer,
  bypass boolean NOT NULL,
  CONSTRAINT default_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN jsonb_path_exists(document,path) THEN 1/divisor ELSE NULL::integer END)::historical_default_result IS NOT NULL)=expected_present END),
  CONSTRAINT default_history_named CHECK (CASE WHEN bypass THEN true ELSE
    jsonb_path_exists(path=>path,target=>to_jsonb(GREATEST(score,divisor))) IS NOT DISTINCT FROM expected_exists END),
  CONSTRAINT default_history_mutation CHECK (CASE WHEN bypass THEN true ELSE
    (jsonb_set('{}'::jsonb,ARRAY['max'],to_jsonb(GREATEST(score,divisor)))->>'max')::integer IS NOT DISTINCT FROM expected_max END)
);
ALTER TYPE historical_default_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_selection_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_selection_history (
  score integer,
  divisor integer NOT NULL,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT greatest_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,GREATEST(CASE score WHEN 1 THEN 1/divisor ELSE NULL::integer END,divisor))::historical_selection_result IS NOT NULL)=expected_present END),
  CONSTRAINT least_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,LEAST(CASE score WHEN 1 THEN 1/divisor ELSE NULL::integer END,divisor))::historical_selection_result IS NOT NULL)=expected_present END),
  CONSTRAINT case_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE score WHEN 1::bigint THEN 1/divisor WHEN 2 THEN
      CASE divisor WHEN 0 THEN 3 ELSE 1/divisor END ELSE NULL::integer END)::historical_selection_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_selection_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_container_record AS (score integer, obsolete_reading inspection_reading);
CREATE TYPE historical_container_array AS (score integer, obsolete_spans numrange[]);
CREATE TYPE historical_container_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_container_history (
  score integer,
  divisor integer NOT NULL,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT container_history_record CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,'(2,ab,"[1,4)")'::inspection_reading)::historical_container_record IS NOT NULL)=expected_present END),
  CONSTRAINT container_history_array CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,'{"[1.2300,2.4500]",NULL,empty}'::numrange[])::historical_container_array IS NOT NULL)=expected_present END),
  CONSTRAINT container_history_range CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN lower_inc('[1.2300,2.4500]'::numrange) AND upper_inc('[1.2300,2.4500]'::numrange)
      THEN 1/divisor ELSE NULL::integer END)::historical_container_result IS NOT NULL)=expected_present END),
  CONSTRAINT container_history_multirange CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN to_jsonb('{[1,3),[5,9)}'::int4multirange)::text COLLATE "C"='"{[1,3),[5,9)}"' COLLATE "C"
      THEN 1/divisor ELSE NULL::integer END)::historical_container_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_container_record DROP ATTRIBUTE obsolete_reading;
ALTER TYPE historical_container_array DROP ATTRIBUTE obsolete_spans;
ALTER TYPE historical_container_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_xml_reading AS (score integer, obsolete_document xml);
CREATE TYPE historical_money_reading AS (score integer, obsolete_amount money);
CREATE TYPE historical_leaf_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_xml_money_history (
  score integer,
  divisor integer NOT NULL,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT xml_history_storage CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,'text<a/>tail'::xml)::historical_xml_reading IS NOT NULL)=expected_present END),
  CONSTRAINT money_history_units CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,'1.25'::money)::historical_money_reading IS NOT NULL)=expected_present END),
  CONSTRAINT xml_history_text CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN ('<r/>'::xml)::text COLLATE "C"='<r/>' COLLATE "C"
      THEN 1/divisor ELSE NULL::integer END)::historical_leaf_result IS NOT NULL)=expected_present END),
  CONSTRAINT money_history_send CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN encode(cash_send('1.25'::money),'hex') COLLATE "C"='000000000000007d' COLLATE "C"
      THEN 1/divisor ELSE NULL::integer END)::historical_leaf_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_xml_reading DROP ATTRIBUTE obsolete_document;
ALTER TYPE historical_money_reading DROP ATTRIBUTE obsolete_amount;
ALTER TYPE historical_leaf_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_operation_field AS (reading integer);
CREATE TYPE historical_operation_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_operation_history (
  score integer,
  divisor integer NOT NULL,
  expected_present boolean,
  bypass boolean NOT NULL,
  CONSTRAINT nullif_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,NULLIF(score,CASE WHEN score=1 THEN 1/divisor ELSE NULL::integer END))::historical_operation_result IS NOT NULL)=expected_present END),
  CONSTRAINT distinct_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN score IS NOT DISTINCT FROM 1 THEN 1/divisor ELSE NULL::integer END)::historical_operation_result IS NOT NULL)=expected_present END),
  CONSTRAINT field_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN ('(1)'::historical_operation_field).reading=score THEN 1/divisor ELSE NULL::integer END)::historical_operation_result IS NOT NULL)=expected_present END),
  CONSTRAINT polymorphic_history_result CHECK (CASE WHEN bypass THEN true ELSE
    (ROW(score,CASE WHEN lower('[1,3)'::int4range)=score THEN 1/divisor ELSE NULL::integer END)::historical_operation_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_operation_field RENAME ATTRIBUTE reading TO current_reading;
ALTER TYPE historical_operation_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_predicate_value AS (reading integer, obsolete integer);
CREATE TYPE historical_predicate_result AS (score integer, obsolete_result integer);
CREATE TABLE inspection_predicate_history (
 score integer,
 divisor integer NOT NULL,
 label text NOT NULL,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT boolean_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN (score/divisor>0) IS NOT FALSE THEN 1/divisor ELSE NULL::integer END)::historical_predicate_result IS NOT NULL)=expected_present END),
 CONSTRAINT anonymous_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN ROW(score/divisor,label) IS NOT NULL THEN 1/divisor ELSE NULL::integer END)::historical_predicate_result IS NOT NULL)=expected_present END),
 CONSTRAINT named_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,(ROW(score,1/divisor)::historical_predicate_value).reading)::historical_predicate_result IS NOT NULL)=expected_present END),
 CONSTRAINT datum_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN ROW(score/divisor,NULL) IS DISTINCT FROM NULL THEN 1 ELSE NULL::integer END)::historical_predicate_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_predicate_value DROP ATTRIBUTE obsolete;
ALTER TYPE historical_predicate_value RENAME ATTRIBUTE reading TO current_reading;
ALTER TYPE historical_predicate_value ADD ATTRIBUTE added integer;
ALTER TYPE historical_predicate_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_quantifier_result AS (score integer, obsolete_result boolean);
CREATE TABLE inspection_quantifier_history (
 score integer,
 divisor integer NOT NULL,
 label text COLLATE "C",
 expected_number boolean,
 expected_text boolean,
 bypass boolean NOT NULL,
 CONSTRAINT any_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,score=ANY(ARRAY[divisor,NULL]))::historical_quantifier_result IS NOT NULL)=expected_number END),
 CONSTRAINT all_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,score<>ALL(ARRAY[divisor,NULL]))::historical_quantifier_result IS NOT NULL)=expected_number END),
 CONSTRAINT text_any_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,label=ANY(ARRAY['1',NULL]))::historical_quantifier_result IS NOT NULL)=expected_text END),
 CONSTRAINT guarded_any_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN score=ANY(ARRAY[divisor,NULL]) THEN 1/divisor>0 ELSE NULL::boolean END)::historical_quantifier_result IS NOT NULL)=expected_number END)
);
ALTER TYPE historical_quantifier_result DROP ATTRIBUTE obsolete_result;

CREATE DOMAIN historical_checked_scalar AS integer CHECK(VALUE>=0);
CREATE TABLE historical_coercion_parent(score integer CONSTRAINT historical_coercion_score CHECK(score>=0));
CREATE TABLE historical_coercion_child(divisor integer) INHERITS(historical_coercion_parent);
CREATE TYPE historical_coercion_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_coercion_history (
 score integer,
 divisor integer NOT NULL,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT domain_history_coercion CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,(score/divisor)::historical_checked_scalar)::historical_coercion_result IS NOT NULL)=expected_present END),
 CONSTRAINT domain_history_relabel CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,(score/divisor)::historical_checked_scalar::integer)::historical_coercion_result IS NOT NULL)=expected_present END),
 CONSTRAINT ancestor_history_coercion CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,(ROW(score,1/divisor)::historical_coercion_child::historical_coercion_parent).score)::historical_coercion_result IS NOT NULL)=expected_present END)
);
ALTER DOMAIN historical_checked_scalar ADD CHECK(VALUE>=2);
ALTER TABLE historical_coercion_child NO INHERIT historical_coercion_parent;

CREATE TABLE historical_mismatch_parent(score integer);
CREATE TABLE historical_mismatch_child(divisor integer) INHERITS(historical_mismatch_parent);
CREATE TABLE inspection_mismatch_history (
 score integer,
 divisor integer NOT NULL,
 missing boolean NOT NULL,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT mismatch_history_coercion CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,((CASE WHEN missing THEN NULL::historical_mismatch_child ELSE
     ROW(score/divisor,1)::historical_mismatch_child END)::historical_mismatch_parent).score)::historical_coercion_result IS NOT NULL)=expected_present END)
);
ALTER TABLE historical_mismatch_child NO INHERIT historical_mismatch_parent;
ALTER TABLE historical_mismatch_parent RENAME COLUMN score TO current_score;
ALTER TABLE historical_mismatch_parent ADD CONSTRAINT historical_mismatch_score CHECK(current_score>=0);
ALTER TABLE historical_mismatch_child ADD CONSTRAINT historical_mismatch_score CHECK(score>=0);
ALTER TYPE historical_coercion_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_ordering_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_ordering_history (
 score integer,
 peer integer,
 divisor integer NOT NULL,
 label text COLLATE "C" NOT NULL,
 expected_order boolean,
 expected_text boolean,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT numeric_row_order CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,score/divisor)<ROW(peer,0)) IS NOT DISTINCT FROM expected_order END),
 CONSTRAINT text_row_order CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(label,score/divisor)<ROW('m',0)) IS NOT DISTINCT FROM expected_text END),
 CONSTRAINT stored_row_order CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN ROW(score,score/divisor)<ROW(peer,0) THEN 1 ELSE NULL::integer END)::historical_ordering_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_ordering_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_variadic_result AS(score integer,obsolete_result jsonb);
CREATE TABLE inspection_variadic_history (
 score integer,
 divisor integer NOT NULL,
 label text COLLATE "C",
 missing boolean NOT NULL,
 expected_payload jsonb,
 expected_numbers jsonb,
 expected_raw text COLLATE "C",
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT variadic_expanded_values CHECK(CASE WHEN bypass THEN true ELSE
   jsonb_build_array(score,divisor,label) IS NOT DISTINCT FROM expected_payload END),
 CONSTRAINT variadic_explicit_values CHECK(CASE WHEN bypass THEN true ELSE
   jsonb_build_array(VARIADIC CASE WHEN missing THEN NULL::integer[] ELSE ARRAY[score,divisor] END)
     IS NOT DISTINCT FROM expected_numbers END),
 CONSTRAINT variadic_raw_values CHECK(CASE WHEN bypass THEN true ELSE
   (CASE WHEN missing THEN NULL::json ELSE json_build_object(label,score/divisor,'again',label) END)::text
     COLLATE "C"=expected_raw END),
 CONSTRAINT variadic_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,jsonb_build_array(VARIADIC CASE WHEN missing THEN NULL::integer[] ELSE
     ARRAY[score/divisor,divisor] END))::historical_variadic_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_variadic_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_xml_expression_result AS(score integer,obsolete_result xml);
CREATE TABLE inspection_xml_expression_history (
 score integer,
 divisor integer NOT NULL,
 label text COLLATE "C",
 missing boolean NOT NULL,
 expected_xml text COLLATE "C",
 expected_parse text COLLATE "C",
 expected_document boolean,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT xml_expression_constructed CHECK(CASE WHEN bypass THEN true ELSE
   XMLSERIALIZE(CONTENT XMLELEMENT(NAME "😊",XMLATTRIBUTES(label AS "_x1F60A_"),score/divisor) AS text)
     COLLATE "C" IS NOT DISTINCT FROM expected_xml END),
 CONSTRAINT xml_expression_serialized CHECK(CASE WHEN bypass THEN true ELSE
   (CASE WHEN missing THEN NULL::text ELSE
     XMLSERIALIZE(DOCUMENT XMLPARSE(CONTENT label) AS text INDENT) END) COLLATE "C"=expected_parse END),
 CONSTRAINT xml_expression_document CHECK(CASE WHEN bypass THEN true ELSE
   (XMLPARSE(CONTENT label) IS DOCUMENT) IS NOT DISTINCT FROM expected_document END),
 CONSTRAINT xml_expression_history CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,XMLCONCAT(XMLPARSE(CONTENT label),XMLFOREST(score/divisor AS "a b")))::historical_xml_expression_result
     IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_xml_expression_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_text_like_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_text_like_history (
 score integer,
 divisor integer NOT NULL,
 expected_octet bytea,
 expected_name text COLLATE "C",
 expected_cursor text COLLATE "C",
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT text_like_char CHECK(CASE WHEN bypass THEN true ELSE
   charsend('\377'::"char") IS NOT DISTINCT FROM expected_octet END),
 CONSTRAINT text_like_name CHECK(CASE WHEN bypass THEN true ELSE
   ('tail '::name)::text COLLATE "C" IS NOT DISTINCT FROM expected_name END),
 CONSTRAINT text_like_cursor CHECK(CASE WHEN bypass THEN true ELSE
   ('cursor é😊'::refcursor)::text COLLATE "C" IS NOT DISTINCT FROM expected_cursor END),
 CONSTRAINT text_like_array CHECK(CASE WHEN bypass THEN true ELSE
   (('[-1:1]={alpha,NULL,"tail "}'::name[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_name END),
 CONSTRAINT text_like_history CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN charsend('\377'::"char")=expected_octet AND
     (('[-1:1]={alpha,NULL,"tail "}'::name[])[1])::text COLLATE "C"=expected_name
     THEN 1/divisor ELSE NULL::integer END)::historical_text_like_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_text_like_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_geometry_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_geometry_history (
 score integer,
 divisor integer NOT NULL,
 expected_point bytea,
 expected_path bytea,
 expected_bounds bytea,
 expected_fixed bytea,
 expected_array boolean,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT geometry_history_point CHECK(CASE WHEN bypass THEN true ELSE
   point_send('(-0,NaN)'::point) IS NOT DISTINCT FROM expected_point END),
 CONSTRAINT geometry_history_path CHECK(CASE WHEN bypass THEN true ELSE
   path_send('[(1,2),(3,4)]'::path) IS NOT DISTINCT FROM expected_path END),
 CONSTRAINT geometry_history_bounds CHECK(CASE WHEN bypass THEN true ELSE
   box_send(box('((0,0),(-0,-0),(3,4))'::polygon)) IS NOT DISTINCT FROM expected_bounds END),
 CONSTRAINT geometry_history_fixed CHECK(CASE WHEN bypass THEN true ELSE
   (line_send('{1,2,-0}'::line)||lseg_send('[(1,2),(3,4)]'::lseg)||circle_send('<(-0,2),3>'::circle))
     IS NOT DISTINCT FROM expected_fixed END),
 CONSTRAINT geometry_history_array CHECK(CASE WHEN bypass THEN true ELSE
   (('[-2:-1]={"(1,2)",NULL}'::point[])[-2] ~= '(1,2)'::point) IS NOT DISTINCT FROM expected_array END),
 CONSTRAINT geometry_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN point_send('(-0,NaN)'::point)=expected_point THEN 1/divisor ELSE NULL::integer END)::historical_geometry_result
     IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_geometry_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_system_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_system_history (
 score integer,
 divisor integer NOT NULL,
 expected_words bytea,
 expected_wide bytea,
 expected_pointer bytea,
 expected_array boolean,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT system_history_words CHECK(CASE WHEN bypass THEN true ELSE
   (oidsend('4294967295'::oid)||xidsend('4294967295'::xid)||cidsend('4294967295'::cid))
     IS NOT DISTINCT FROM expected_words END),
 CONSTRAINT system_history_wide CHECK(CASE WHEN bypass THEN true ELSE
   (xid8send('18446744073709551615'::xid8)||pg_lsn_send('80000000/0'::pg_lsn))
     IS NOT DISTINCT FROM expected_wide END),
 CONSTRAINT system_history_pointer CHECK(CASE WHEN bypass THEN true ELSE
   tidsend('(305419896,4660)'::tid) IS NOT DISTINCT FROM expected_pointer END),
 CONSTRAINT system_history_array CHECK(CASE WHEN bypass THEN true ELSE
   ((('[-1:1]={4294967295,NULL,0}'::oid[])[-1]='4294967295'::oid) AND
     (('{"(305419896,4660)",NULL}'::tid[])[1]='(305419896,4660)'::tid))
     IS NOT DISTINCT FROM expected_array END),
 CONSTRAINT system_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN (oidsend('4294967295'::oid)||xidsend('4294967295'::xid)||cidsend('4294967295'::cid))=expected_words
     THEN 1/divisor ELSE NULL::integer END)::historical_system_result
     IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_system_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_vector_values AS(positions int2vector,type_ids oidvector,old integer);
CREATE TYPE historical_vector_result AS(score integer,obsolete_result int2vector);
CREATE TABLE inspection_vector_history (
 score integer,
 divisor integer NOT NULL,
 expected_positions text COLLATE "C",
 expected_types text COLLATE "C",
 expected_rank integer,
 expected_payload jsonb,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT vector_history_positions CHECK(CASE WHEN bypass THEN true ELSE
   ('-32768 0 32767'::int2vector)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions END),
 CONSTRAINT vector_history_types CHECK(CASE WHEN bypass THEN true ELSE
   ('4294967295 0'::oidvector)::text COLLATE "C" IS NOT DISTINCT FROM expected_types END),
 CONSTRAINT vector_history_empty CHECK(CASE WHEN bypass THEN true ELSE
   array_ndims(''::int2vector)=expected_rank END),
 CONSTRAINT vector_history_array CHECK(CASE WHEN bypass THEN true ELSE
   (('{"-32768 0 32767",NULL,""}'::int2vector[])[1])::text COLLATE "C"
     IS NOT DISTINCT FROM expected_positions END),
 CONSTRAINT vector_history_record CHECK(CASE WHEN bypass THEN true ELSE
   to_jsonb('("-32768 0 32767","4294967295 0",1)'::historical_vector_values)
     IS NOT DISTINCT FROM expected_payload END),
 CONSTRAINT vector_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN ('-32768 0 32767'::int2vector)::text COLLATE "C"=expected_positions
     THEN ARRAY[score/divisor,0]::int2vector ELSE NULL::int2vector END)::historical_vector_result
     IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_vector_values DROP ATTRIBUTE old;
ALTER TYPE historical_vector_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_snapshot_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_snapshot_history (
 score integer,
 divisor integer NOT NULL,
 input_text text COLLATE "C",
 expected_lower text COLLATE "C",
 expected_modern bytea,
 expected_legacy bytea,
 expected_upper text COLLATE "C",
 expected_visible boolean,
 expected_payload jsonb,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT snapshot_history_modern CHECK(CASE WHEN bypass THEN true ELSE
   pg_snapshot_send('1:9:3,3,5'::pg_snapshot) IS NOT DISTINCT FROM expected_modern END),
 CONSTRAINT snapshot_history_legacy CHECK(CASE WHEN bypass THEN true ELSE
   txid_snapshot_send('18446744073709551614:18446744073709551615:18446744073709551614'::txid_snapshot)
     IS NOT DISTINCT FROM expected_legacy END),
 CONSTRAINT snapshot_history_upper CHECK(CASE WHEN bypass THEN true ELSE
   txid_snapshot_xmax('18446744073709551614:18446744073709551615:18446744073709551614'::txid_snapshot)::text
     COLLATE "C" IS NOT DISTINCT FROM expected_upper END),
 CONSTRAINT snapshot_history_visible CHECK(CASE WHEN bypass THEN true ELSE
   pg_visible_in_snapshot('4'::xid8,'1:9:3,5'::pg_snapshot) IS NOT DISTINCT FROM expected_visible END),
 CONSTRAINT snapshot_history_payload CHECK(CASE WHEN bypass THEN true ELSE
   to_jsonb('{"1:9:3,5",NULL,"1:1:"}'::pg_snapshot[]) IS NOT DISTINCT FROM expected_payload END),
 CONSTRAINT snapshot_history_input CHECK(CASE WHEN bypass THEN true ELSE
   pg_snapshot_xmin(input_text::pg_snapshot)::text COLLATE "C"=expected_lower END),
 CONSTRAINT snapshot_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN pg_visible_in_snapshot('4'::xid8,'1:9:3,5'::pg_snapshot)=expected_visible
     THEN score/divisor ELSE NULL::integer END)::historical_snapshot_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_snapshot_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_fulltext_value AS(document tsvector,query tsquery,obsolete integer);
CREATE TYPE historical_fulltext_result AS(score integer,obsolete_result integer);
CREATE TABLE inspection_fulltext_history (
 score integer,
 divisor integer NOT NULL,
 expected_document text COLLATE "C",
 expected_query bytea,
 expected_match boolean,
 expected_array jsonb,
 expected_record jsonb,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT fulltext_history_document CHECK(CASE WHEN bypass THEN true ELSE
   ('b:2C a:1A,3B'::tsvector)::text COLLATE "C" IS NOT DISTINCT FROM expected_document END),
 CONSTRAINT fulltext_history_query CHECK(CASE WHEN bypass THEN true ELSE
   tsquerysend('a & (b | c)'::tsquery) IS NOT DISTINCT FROM expected_query END),
 CONSTRAINT fulltext_history_match CHECK(CASE WHEN bypass THEN true ELSE
   ('b:2C a:1A,3B'::tsvector @@ 'a & (b | c)'::tsquery) IS NOT DISTINCT FROM expected_match END),
 CONSTRAINT fulltext_history_array CHECK(CASE WHEN bypass THEN true ELSE
   to_jsonb('{a:1A,NULL,b}'::tsvector[]) IS NOT DISTINCT FROM expected_array END),
 CONSTRAINT fulltext_history_record CHECK(CASE WHEN bypass THEN true ELSE
   to_jsonb('("a:1A","a & (b & c)",1)'::historical_fulltext_value) IS NOT DISTINCT FROM expected_record END),
 CONSTRAINT fulltext_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score,CASE WHEN ('b:2C a:1A,3B'::tsvector @@ 'a & (b | c)'::tsquery)=expected_match
     THEN score/divisor ELSE NULL::integer END)::historical_fulltext_result IS NOT NULL)=expected_present END)
);
ALTER TYPE historical_fulltext_value DROP ATTRIBUTE obsolete;
ALTER TYPE historical_fulltext_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_alias_value AS(object regclass,roles regrole[],obsolete integer);
CREATE TYPE historical_alias_result AS(score integer,obsolete_result regclass[]);
CREATE TABLE inspection_alias_history (
 score integer,
 divisor integer NOT NULL,
 expected_text text COLLATE "C",
 expected_wire bytea,
 expected_roles jsonb,
 expected_record jsonb,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT alias_history_text CHECK(CASE WHEN bypass THEN true ELSE
   (CASE WHEN score>=0 THEN '0'::regclass ELSE NULL::regclass END)::text COLLATE "C"
     IS NOT DISTINCT FROM expected_text END),
 CONSTRAINT alias_history_wire CHECK(CASE WHEN bypass THEN true ELSE
   regopersend(CASE WHEN score>=0 THEN '0'::regoper ELSE NULL::regoper END)
     IS NOT DISTINCT FROM expected_wire END),
 CONSTRAINT alias_history_roles CHECK(CASE WHEN bypass THEN true ELSE
   to_jsonb('[0:1]={0,NULL}'::regrole[]) IS NOT DISTINCT FROM expected_roles END),
 CONSTRAINT alias_history_record CHECK(CASE WHEN bypass THEN true ELSE
   to_jsonb('(-,"{0,NULL}",1)'::historical_alias_value) IS NOT DISTINCT FROM expected_record END),
 CONSTRAINT alias_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score/divisor,'{0,NULL}'::regclass[])::historical_alias_result IS NOT NULL)
     IS NOT DISTINCT FROM expected_present END)
);
ALTER TYPE historical_alias_value DROP ATTRIBUTE obsolete;
ALTER TYPE historical_alias_value RENAME ATTRIBUTE object TO current_object;
ALTER TYPE historical_alias_result DROP ATTRIBUTE obsolete_result;

CREATE TYPE historical_acl_result AS(score integer,obsolete_acl aclitem);
CREATE TABLE inspection_acl_history (
 score integer,
 divisor integer NOT NULL,
 expected_nonnull boolean,
 expected_count integer,
 expected_equal boolean,
 expected_present boolean,
 obsolete_call boolean NOT NULL,
 bypass boolean NOT NULL,
 CONSTRAINT acl_history_nonnull CHECK(CASE WHEN bypass THEN true ELSE
   ('=r/postgres'::aclitem IS NOT NULL) IS NOT DISTINCT FROM expected_nonnull END),
 CONSTRAINT acl_history_count CHECK(CASE WHEN bypass THEN true ELSE
   cardinality('{=r/postgres,NULL}'::aclitem[]) IS NOT DISTINCT FROM expected_count END),
 CONSTRAINT acl_history_equal CHECK(CASE WHEN bypass THEN true ELSE
   ('=r/postgres'::aclitem=makeaclitem(score::oid,score::oid,'UPDATE',false))
     IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT acl_history_contains CHECK(CASE WHEN bypass THEN true ELSE
   aclcontains('{=r/postgres}'::aclitem[],makeaclitem(score::oid,score::oid,'UPDATE',false))
     IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT acl_history_result CHECK(CASE WHEN bypass THEN true ELSE
   (ROW(score/divisor,'=r/postgres'::aclitem)::historical_acl_result IS NOT NULL)
     IS NOT DISTINCT FROM expected_present END),
 CONSTRAINT acl_history_text_presence CHECK(CASE WHEN bypass THEN true ELSE
   (('=r/postgres'::aclitem)::text IS NOT NULL) IS NOT DISTINCT FROM expected_nonnull END),
 CONSTRAINT acl_history_obsolete CHECK(CASE WHEN bypass OR NOT obsolete_call THEN true ELSE
   aclinsert('{=r/postgres}'::aclitem[],makeaclitem(score::oid,score::oid,'SELECT',false)) IS NULL END)
);
ALTER TYPE historical_acl_result DROP ATTRIBUTE obsolete_acl;

CREATE TABLE inspection_quoted_identifiers (
 label text COLLATE "C",
 expected_text text COLLATE "C",
 expected_present boolean,
 expected_selected text COLLATE "C",
 choose_label boolean NOT NULL,
 divisor integer NOT NULL,
 bypass boolean NOT NULL,
 CONSTRAINT identifier_quoted_text CHECK(CASE WHEN bypass THEN true ELSE
   quote_ident(label) COLLATE "C" IS NOT DISTINCT FROM expected_text END),
 CONSTRAINT identifier_quoted_presence CHECK(CASE WHEN bypass THEN true ELSE
   (quote_ident(label) IS NOT NULL) IS NOT DISTINCT FROM expected_present END),
 CONSTRAINT identifier_quoted_selection CHECK(CASE WHEN bypass THEN true ELSE
   quote_ident(CASE WHEN choose_label THEN label ELSE NULL::text END) COLLATE "C"
     IS NOT DISTINCT FROM expected_selected END),
 CONSTRAINT identifier_quoted_child_error CHECK(CASE WHEN bypass THEN true ELSE
   (quote_ident(label||(1/divisor)::text) IS NOT NULL) IS NOT DISTINCT FROM expected_present END)
);
CREATE TABLE inspection_identifier_presence (
 label text,
 expected_present boolean,
 bypass boolean NOT NULL,
 CONSTRAINT identifier_context_free_presence CHECK(CASE WHEN bypass THEN true ELSE
   (quote_ident(label) IS NOT NULL) IS NOT DISTINCT FROM expected_present END)
);

CREATE TABLE inspection_name_casts (
 source text COLLATE "C",
 varying_value varchar COLLATE "C",
 padded bpchar COLLATE "C",
 reference name COLLATE "C",
 expected_equal boolean,
 expected_padded boolean,
 expected_less boolean,
 expected_nulled boolean,
 expected_array boolean,
 bypass boolean NOT NULL,
 CONSTRAINT name_cast_text_equal CHECK(CASE WHEN bypass THEN true ELSE
   (source::name=reference) IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT name_cast_varying_equal CHECK(CASE WHEN bypass THEN true ELSE
   (varying_value::name=reference) IS NOT DISTINCT FROM expected_equal END),
 CONSTRAINT name_cast_padded_equal CHECK(CASE WHEN bypass THEN true ELSE
   (padded::name=reference) IS NOT DISTINCT FROM expected_padded END),
 CONSTRAINT name_cast_order CHECK(CASE WHEN bypass THEN true ELSE
   (source::name<reference) IS NOT DISTINCT FROM expected_less END),
 CONSTRAINT name_cast_nullif CHECK(CASE WHEN bypass THEN true ELSE
   (NULLIF(source::name,reference) IS NULL) IS NOT DISTINCT FROM expected_nulled END),
 CONSTRAINT name_cast_array CHECK(CASE WHEN bypass THEN true ELSE
   (ARRAY[source::name]=ARRAY[reference]) IS NOT DISTINCT FROM expected_array END)
);
