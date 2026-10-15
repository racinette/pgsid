-- @world checks
CREATE DOMAIN report_cursor_name AS refcursor;
CREATE DOMAIN export_cursor_name AS report_cursor_name;
CREATE TABLE export_sessions (
 id integer PRIMARY KEY,
 label text NOT NULL,
 primary_cursor export_cursor_name,
 fallback_cursor refcursor,
 expected_name text,
 pinned boolean NOT NULL,
 CONSTRAINT session_cursor_name CHECK((CASE WHEN pinned THEN primary_cursor ELSE COALESCE(primary_cursor,fallback_cursor) END)::text COLLATE "C"=expected_name COLLATE "C")
);
CREATE TABLE cursor_imports (
 id integer PRIMARY KEY,
 session_id integer NOT NULL REFERENCES export_sessions(id),
 label text NOT NULL,
 source_name char(8),
 source_text text,
 expected_padded text,
 expected_source text,
 bypass boolean NOT NULL,
 CONSTRAINT import_padded_name CHECK(CASE WHEN bypass THEN true ELSE source_name::export_cursor_name::text COLLATE "C"=expected_padded COLLATE "C" END),
 CONSTRAINT import_source_name CHECK(CASE WHEN bypass THEN true ELSE source_text::refcursor::text COLLATE "C"=expected_source COLLATE "C" END)
);
CREATE TABLE cursor_labels (
 id integer PRIMARY KEY,
 session_id integer NOT NULL REFERENCES export_sessions(id),
 label text NOT NULL,
 cursor_name refcursor,
 expected_short text,
 wire bytea,
 ascii_transport boolean NOT NULL,
 allow_absent boolean NOT NULL,
 CONSTRAINT cursor_presence CHECK((cursor_name IS NULL)=allow_absent),
 CONSTRAINT cursor_short CHECK(cursor_name::varchar(3)::text COLLATE "C"=expected_short COLLATE "C"),
 CONSTRAINT cursor_wire CHECK(CASE WHEN ascii_transport THEN textsend(cursor_name::text)=wire ELSE true END)
);
