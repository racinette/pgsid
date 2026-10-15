-- @world checks
CREATE DOMAIN normalized_document AS jsonb;
CREATE DOMAIN retained_normalized_document AS normalized_document;
CREATE TABLE stored_documents (
 id integer PRIMARY KEY,
 label text NOT NULL,
 document retained_normalized_document,
 recorded_kind text NOT NULL,
 recorded_source text,
 allow_absent boolean NOT NULL,
 CONSTRAINT stored_kind CHECK(jsonb_typeof(document) COLLATE "C"=recorded_kind COLLATE "C"),
 CONSTRAINT stored_source CHECK(document::text COLLATE "C"=recorded_source COLLATE "C"),
 CONSTRAINT stored_presence CHECK((document IS NULL)=allow_absent)
);
CREATE TABLE document_choices (
 id integer PRIMARY KEY,
 store_id integer NOT NULL REFERENCES stored_documents(id),
 label text NOT NULL,
 primary_document retained_normalized_document,
 backup_document jsonb,
 choose_primary boolean NOT NULL,
 recorded_kind text,
 recorded_source text,
 CONSTRAINT choice_kind CHECK(jsonb_typeof(CASE WHEN choose_primary THEN primary_document ELSE backup_document END) COLLATE "C"=recorded_kind COLLATE "C"),
 CONSTRAINT choice_source CHECK(COALESCE(primary_document,backup_document,NULL::jsonb)::text COLLATE "C"=recorded_source COLLATE "C")
);
CREATE DOMAIN archived_document AS json;
CREATE DOMAIN retained_document AS archived_document;
CREATE TABLE document_archives (
 id integer PRIMARY KEY,
 label text NOT NULL,
 document retained_document,
 recorded_kind text NOT NULL,
 recorded_source text,
 allow_absent boolean NOT NULL,
 CONSTRAINT archive_kind CHECK(json_typeof(document) COLLATE "C"=recorded_kind COLLATE "C"),
 CONSTRAINT archive_source CHECK(document::text COLLATE "C"=recorded_source COLLATE "C"),
 CONSTRAINT archive_presence CHECK((document IS NULL)=allow_absent)
);
CREATE TABLE document_routes (
 id integer PRIMARY KEY,
 archive_id integer NOT NULL REFERENCES document_archives(id),
 label text NOT NULL,
 primary_document retained_document,
 backup_document json,
 choose_primary boolean NOT NULL,
 recorded_kind text,
 recorded_source text,
 CONSTRAINT route_kind CHECK(json_typeof(CASE WHEN choose_primary THEN primary_document ELSE backup_document END) COLLATE "C"=recorded_kind COLLATE "C"),
 CONSTRAINT route_source CHECK(COALESCE(primary_document,backup_document,NULL::json)::text COLLATE "C"=recorded_source COLLATE "C")
);
CREATE TABLE document_reviews (
 id integer PRIMARY KEY,
 archive_id integer NOT NULL REFERENCES document_archives(id),
 label text NOT NULL,
 document retained_document,
 recorded_kind text,
 recorded_source text,
 bypass boolean NOT NULL,
 CONSTRAINT review_kind CHECK(CASE WHEN bypass THEN true ELSE json_typeof(COALESCE(document,NULL::json)) COLLATE "C"=recorded_kind COLLATE "C" END),
 CONSTRAINT review_source CHECK(CASE WHEN bypass THEN true ELSE document::text COLLATE "C"=recorded_source COLLATE "C" END)
);
CREATE TABLE document_imports (
 id integer PRIMARY KEY,
 archive_id integer NOT NULL REFERENCES document_archives(id),
 label text NOT NULL,
 source_text text,
 recorded_kind text,
 recorded_source text,
 bypass boolean NOT NULL,
 allow_absent boolean NOT NULL,
 CONSTRAINT import_kind CHECK(CASE WHEN bypass THEN true ELSE json_typeof(source_text::retained_document) COLLATE "C"=recorded_kind COLLATE "C" END),
 CONSTRAINT import_source CHECK(CASE WHEN bypass THEN true ELSE COALESCE(source_text::retained_document,'null'::json)::text COLLATE "C"=recorded_source COLLATE "C" END),
 CONSTRAINT import_presence CHECK(CASE WHEN bypass THEN true ELSE (source_text::retained_document IS NULL)=allow_absent END)
);
CREATE TABLE document_fields (
 id integer PRIMARY KEY,
 archive_id integer NOT NULL REFERENCES document_archives(id),
 label text NOT NULL,
 document retained_document,
 field_name text NOT NULL,
 recorded_json text,
 recorded_text text,
 allow_missing boolean NOT NULL,
 bypass boolean NOT NULL,
 CONSTRAINT field_source CHECK(CASE WHEN bypass THEN true ELSE (document->field_name)::text COLLATE "C" IS NOT DISTINCT FROM recorded_json COLLATE "C" END),
 CONSTRAINT field_text CHECK(CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
 CONSTRAINT field_presence CHECK(CASE WHEN bypass THEN true ELSE (document->field_name IS NULL)=allow_missing END)
);
CREATE TABLE document_elements (
 id integer PRIMARY KEY,
 archive_id integer NOT NULL REFERENCES document_archives(id),
 label text NOT NULL,
 document retained_document,
 element_index integer NOT NULL,
 recorded_json text,
 recorded_text text,
 recorded_count integer,
 allow_missing boolean NOT NULL,
 bypass boolean NOT NULL,
 CONSTRAINT element_source CHECK(CASE WHEN bypass THEN true ELSE (document->element_index)::text COLLATE "C" IS NOT DISTINCT FROM recorded_json COLLATE "C" END),
 CONSTRAINT element_text CHECK(CASE WHEN bypass THEN true ELSE (document->>element_index) COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
 CONSTRAINT element_presence CHECK(CASE WHEN bypass THEN true ELSE (document->element_index IS NULL)=allow_missing END),
 CONSTRAINT element_count CHECK(CASE WHEN bypass THEN true ELSE json_array_length(document)=recorded_count END)
);
CREATE TABLE document_normalizations (
 id integer PRIMARY KEY,
 store_id integer NOT NULL REFERENCES stored_documents(id),
 label text NOT NULL,
 source_text text,
 recorded_kind text,
 recorded_source text,
 allow_absent boolean NOT NULL,
 bypass boolean NOT NULL,
 CONSTRAINT normalization_kind CHECK(CASE WHEN bypass THEN true ELSE jsonb_typeof(source_text::retained_normalized_document) COLLATE "C"=recorded_kind COLLATE "C" END),
 CONSTRAINT normalization_source CHECK(CASE WHEN bypass THEN true ELSE COALESCE(source_text::retained_normalized_document,'null'::jsonb)::text COLLATE "C"=recorded_source COLLATE "C" END),
 CONSTRAINT normalization_presence CHECK(CASE WHEN bypass THEN true ELSE (source_text::jsonb IS NULL)=allow_absent END),
 CONSTRAINT normalization_bridge CHECK(CASE WHEN bypass THEN true ELSE COALESCE(source_text::json::jsonb,'null'::jsonb)::json::text COLLATE "C"=recorded_source COLLATE "C" END)
);
CREATE TABLE normalized_fields (
 id integer PRIMARY KEY,
 store_id integer NOT NULL REFERENCES stored_documents(id),
 label text NOT NULL,
 document retained_normalized_document,
 field_name text NOT NULL,
 recorded_json text,
 recorded_text text,
 allow_missing boolean NOT NULL,
 recorded_exists boolean,
 bypass boolean NOT NULL,
 CONSTRAINT normalized_field_source CHECK(CASE WHEN bypass THEN true ELSE (document->field_name)::text COLLATE "C" IS NOT DISTINCT FROM recorded_json COLLATE "C" END),
 CONSTRAINT normalized_field_text CHECK(CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
 CONSTRAINT normalized_field_presence CHECK(CASE WHEN bypass THEN true ELSE (document->field_name IS NULL)=allow_missing END),
 CONSTRAINT normalized_field_exists CHECK(CASE WHEN bypass THEN true ELSE (document ? field_name) IS NOT DISTINCT FROM recorded_exists END)
);
CREATE TABLE normalized_elements (
 id integer PRIMARY KEY,
 store_id integer NOT NULL REFERENCES stored_documents(id),
 label text NOT NULL,
 document retained_normalized_document,
 element_index integer NOT NULL,
 recorded_json text,
 recorded_text text,
 recorded_count integer,
 allow_missing boolean NOT NULL,
 bypass boolean NOT NULL,
 CONSTRAINT normalized_element_source CHECK(CASE WHEN bypass THEN true ELSE (document->element_index)::text COLLATE "C" IS NOT DISTINCT FROM recorded_json COLLATE "C" END),
 CONSTRAINT normalized_element_text CHECK(CASE WHEN bypass THEN true ELSE (document->>element_index) COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
 CONSTRAINT normalized_element_presence CHECK(CASE WHEN bypass THEN true ELSE (document->element_index IS NULL)=allow_missing END),
 CONSTRAINT normalized_element_count CHECK(CASE WHEN bypass THEN true ELSE jsonb_array_length(document)=recorded_count END)
);
CREATE TABLE document_comparisons (
 id integer PRIMARY KEY,
 store_id integer NOT NULL REFERENCES stored_documents(id),
 label text NOT NULL,
 document retained_normalized_document,
 compared_document jsonb,
 recorded_equal boolean,
 recorded_unequal boolean,
 recorded_contains boolean,
 recorded_contained boolean,
 bypass boolean NOT NULL,
 CONSTRAINT comparison_equal CHECK(CASE WHEN bypass THEN true ELSE (document=compared_document) IS NOT DISTINCT FROM recorded_equal END),
 CONSTRAINT comparison_unequal CHECK(CASE WHEN bypass THEN true ELSE (document<>compared_document) IS NOT DISTINCT FROM recorded_unequal END),
 CONSTRAINT comparison_contains CHECK(CASE WHEN bypass THEN true ELSE (document @> compared_document) IS NOT DISTINCT FROM recorded_contains END),
 CONSTRAINT comparison_contained CHECK(CASE WHEN bypass THEN true ELSE (document <@ compared_document) IS NOT DISTINCT FROM recorded_contained END)
);
CREATE TABLE document_orderings (
 id integer PRIMARY KEY,
 store_id integer NOT NULL REFERENCES stored_documents(id),
 label text NOT NULL,
 document retained_normalized_document,
 compared_document jsonb,
 recorded_order integer,
 recorded_lower boolean,
 recorded_lower_equal boolean,
 recorded_greater boolean,
 recorded_greater_equal boolean,
 bypass boolean NOT NULL,
 CONSTRAINT ordering_comparator CHECK(CASE WHEN bypass THEN true ELSE jsonb_cmp(document,compared_document) IS NOT DISTINCT FROM recorded_order END),
 CONSTRAINT ordering_lower CHECK(CASE WHEN bypass THEN true ELSE (document<compared_document) IS NOT DISTINCT FROM recorded_lower END),
 CONSTRAINT ordering_lower_equal CHECK(CASE WHEN bypass THEN true ELSE (document<=compared_document) IS NOT DISTINCT FROM recorded_lower_equal END),
 CONSTRAINT ordering_greater CHECK(CASE WHEN bypass THEN true ELSE (document>compared_document) IS NOT DISTINCT FROM recorded_greater END),
 CONSTRAINT ordering_greater_equal CHECK(CASE WHEN bypass THEN true ELSE (document>=compared_document) IS NOT DISTINCT FROM recorded_greater_equal END)
);
