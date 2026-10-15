-- @world checks
CREATE DOMAIN captured_snapshot AS pg_snapshot;
CREATE DOMAIN retained_snapshot AS captured_snapshot;
CREATE DOMAIN legacy_snapshot AS txid_snapshot;
CREATE TABLE snapshot_captures (
 id integer PRIMARY KEY,
 label text NOT NULL,
 captured retained_snapshot,
 expected_wire bytea,
 expected_lower xid8,
 expected_upper xid8,
 allow_absent boolean NOT NULL,
 CONSTRAINT capture_wire CHECK(pg_snapshot_send(captured)=expected_wire),
 CONSTRAINT capture_bounds CHECK(pg_snapshot_xmin(captured)=expected_lower AND pg_snapshot_xmax(captured)=expected_upper),
 CONSTRAINT capture_presence CHECK((captured IS NULL)=allow_absent)
);
CREATE TABLE visibility_requests (
 id integer PRIMARY KEY,
 capture_id integer NOT NULL REFERENCES snapshot_captures(id),
 label text NOT NULL,
 candidate xid8,
 submitted retained_snapshot,
 expected_visible boolean,
 bypass boolean NOT NULL,
 allow_absent boolean NOT NULL,
 CONSTRAINT request_visibility CHECK(CASE WHEN bypass THEN true ELSE pg_visible_in_snapshot(candidate,submitted)=expected_visible END),
 CONSTRAINT request_presence CHECK((submitted IS NULL)=allow_absent)
);
CREATE TABLE legacy_captures (
 id integer PRIMARY KEY,
 capture_id integer NOT NULL REFERENCES snapshot_captures(id),
 label text NOT NULL,
 captured legacy_snapshot,
 candidate bigint,
 expected_wire bytea,
 expected_lower bigint,
 expected_upper bigint,
 expected_visible boolean,
 allow_absent boolean NOT NULL,
 CONSTRAINT legacy_wire CHECK(txid_snapshot_send(captured)=expected_wire),
 CONSTRAINT legacy_bounds CHECK(txid_snapshot_xmin(captured)=expected_lower AND txid_snapshot_xmax(captured)=expected_upper),
 CONSTRAINT legacy_visibility CHECK(txid_visible_in_snapshot(candidate,captured)=expected_visible),
 CONSTRAINT legacy_presence CHECK((captured IS NULL)=allow_absent)
);
CREATE TABLE snapshot_imports (
 id integer PRIMARY KEY,
 capture_id integer NOT NULL REFERENCES snapshot_captures(id),
 label text NOT NULL,
 source_text text,
 expected_text text,
 expected_lower xid8,
 bypass boolean NOT NULL,
 CONSTRAINT import_canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::retained_snapshot::text COLLATE "C"=expected_text COLLATE "C" END),
 CONSTRAINT import_lower CHECK(CASE WHEN bypass THEN true ELSE pg_snapshot_xmin(COALESCE(source_text::retained_snapshot,NULL::retained_snapshot))=expected_lower END)
);
