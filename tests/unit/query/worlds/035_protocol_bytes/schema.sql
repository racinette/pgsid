-- @world checks
CREATE DOMAIN protocol_byte AS "char";
CREATE DOMAIN nested_protocol_byte AS protocol_byte;
CREATE TABLE protocol_bytes (
 id integer PRIMARY KEY,
 label text NOT NULL,
 code nested_protocol_byte,
 wire bytea,
 signed_value integer,
 rendered text,
 reference "char",
 recorded_order integer,
 CONSTRAINT byte_wire CHECK(charsend(code)=wire),
 CONSTRAINT byte_signed CHECK(code::integer=signed_value),
 CONSTRAINT byte_rendered CHECK(code::text=rendered),
 CONSTRAINT byte_order CHECK(btcharcmp(code,reference)=recorded_order)
);
CREATE TABLE byte_selections (
 id integer PRIMARY KEY,
 protocol_id integer NOT NULL REFERENCES protocol_bytes(id),
 label text NOT NULL,
 code "char",
 alternative "char",
 use_code boolean NOT NULL,
 selected "char",
 smallest "char",
 largest "char",
 different boolean,
 unequal_wire bytea,
 CONSTRAINT byte_selection CHECK((CASE WHEN use_code THEN code ELSE alternative END)=selected),
 CONSTRAINT byte_extrema CHECK(LEAST(code,alternative)=smallest AND GREATEST(code,alternative)=largest),
 CONSTRAINT byte_distinct CHECK((code IS DISTINCT FROM alternative)=different),
 CONSTRAINT byte_nullif CHECK(charsend(NULLIF(code,alternative))=unequal_wire)
);
CREATE TABLE byte_imports (
 id integer PRIMARY KEY,
 protocol_id integer NOT NULL REFERENCES protocol_bytes(id),
 label text NOT NULL,
 source text,
 integer_value integer,
 wire bytea,
 integer_wire bytea,
 skip_integer boolean NOT NULL,
 CONSTRAINT byte_import_text CHECK(charsend(source::"char")=wire AND charsend(source::varchar::"char")=wire),
 CONSTRAINT byte_import_padded CHECK(charsend(source::bpchar::"char")=wire),
 CONSTRAINT byte_import_integer CHECK(CASE WHEN skip_integer THEN true ELSE charsend(integer_value::"char")=integer_wire END)
);
CREATE TABLE ascii_byte_hashes (
 id integer PRIMARY KEY,
 protocol_id integer NOT NULL REFERENCES protocol_bytes(id),
 label text NOT NULL,
 code "char",
 seed bigint,
 hash_word integer,
 hash_seeded bigint,
 padded_text text,
 CONSTRAINT ascii_byte_hash CHECK(hashchar(code)=hash_word),
 CONSTRAINT ascii_byte_seeded_hash CHECK(hashcharextended(code,seed)=hash_seeded),
 CONSTRAINT ascii_byte_padded CHECK(octet_length(code::bpchar)=1 AND code::bpchar COLLATE "C"=padded_text::bpchar COLLATE "C")
);
