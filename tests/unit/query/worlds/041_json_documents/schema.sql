-- @world checks
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
