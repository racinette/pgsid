-- @world checks
CREATE DOMAIN stored_query_path AS jsonpath;
CREATE DOMAIN retained_query_path AS stored_query_path;
CREATE TABLE query_paths (
 id integer PRIMARY KEY,
 label text NOT NULL,
 path retained_query_path,
 recorded_query text,
 allow_absent boolean NOT NULL,
 CONSTRAINT path_source CHECK(path::text COLLATE "C" IS NOT DISTINCT FROM recorded_query COLLATE "C"),
 CONSTRAINT path_presence CHECK((path IS NULL)=allow_absent)
);
CREATE TABLE query_selections (
 id integer PRIMARY KEY,
 path_id integer NOT NULL REFERENCES query_paths(id),
 label text NOT NULL,
 primary_path retained_query_path,
 backup_path jsonpath,
 choose_primary boolean NOT NULL,
 recorded_choice text,
 recorded_fallback text,
 has_primary boolean GENERATED ALWAYS AS (primary_path IS NOT NULL) STORED,
 CONSTRAINT selected_query CHECK((CASE WHEN choose_primary THEN primary_path ELSE backup_path END)::text COLLATE "C" IS NOT DISTINCT FROM recorded_choice COLLATE "C"),
 CONSTRAINT fallback_query CHECK(COALESCE(primary_path,backup_path,NULL::jsonpath)::text COLLATE "C" IS NOT DISTINCT FROM recorded_fallback COLLATE "C")
);
CREATE TABLE query_packets (
 id integer PRIMARY KEY,
 path_id integer NOT NULL REFERENCES query_paths(id),
 label text NOT NULL,
 path retained_query_path,
 source_text text,
 recorded_query text,
 recorded_wire bytea,
 recorded_version integer,
 bypass boolean NOT NULL,
 CONSTRAINT packet_source CHECK(CASE WHEN bypass THEN true ELSE source_text::retained_query_path::text COLLATE "C" IS NOT DISTINCT FROM recorded_query COLLATE "C" END),
 CONSTRAINT packet_wire CHECK(CASE WHEN bypass THEN true ELSE jsonpath_send(path) IS NOT DISTINCT FROM recorded_wire END),
 CONSTRAINT packet_version CHECK(CASE WHEN bypass THEN true ELSE get_byte(jsonpath_send(path),0) IS NOT DISTINCT FROM recorded_version END)
);
CREATE TABLE query_documents (
 id integer PRIMARY KEY,
 path_id integer NOT NULL REFERENCES query_paths(id),
 label text NOT NULL,
 document jsonb,
 path retained_query_path,
 source_text text,
 variables jsonb,
 silent boolean,
 bypass boolean NOT NULL,
 expected_exists boolean,
 expected_match boolean,
 expected_results jsonb,
 expected_first jsonb,
 CONSTRAINT document_exists CHECK(jsonb_path_exists(document,path,variables,silent) IS NOT DISTINCT FROM expected_exists),
 CONSTRAINT document_match CHECK((document @@ '$.flag'::jsonpath) IS NOT DISTINCT FROM expected_match),
 CONSTRAINT document_results CHECK(jsonb_path_query_array(document,path,variables,silent) IS NOT DISTINCT FROM expected_results),
 CONSTRAINT document_first CHECK(jsonb_path_query_first(document,path,variables,silent) IS NOT DISTINCT FROM expected_first),
 CONSTRAINT document_source CHECK(CASE WHEN bypass THEN true ELSE jsonb_path_query_array(document,source_text::retained_query_path,variables,silent) IS NOT DISTINCT FROM expected_results END)
);
