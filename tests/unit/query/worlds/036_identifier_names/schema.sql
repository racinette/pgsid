-- @world checks
CREATE DOMAIN registry_identifier AS name COLLATE "C";
CREATE DOMAIN nested_registry_identifier AS registry_identifier;
CREATE TABLE registry_names (
 id integer PRIMARY KEY,
 label text NOT NULL,
 identifier nested_registry_identifier,
 rendered text COLLATE "C",
 wire bytea,
 seed bigint NOT NULL DEFAULT 0,
 hash_word integer,
 hash_seeded bigint,
 CONSTRAINT identifier_rendered CHECK(identifier::text COLLATE "C"=rendered),
 CONSTRAINT identifier_wire CHECK(namesend(identifier)=wire),
 CONSTRAINT identifier_hash CHECK(hashname(identifier)=hash_word),
 CONSTRAINT identifier_seeded_hash CHECK(hashnameextended(identifier,seed)=hash_seeded)
);
CREATE TABLE identifier_comparisons (
 id integer PRIMARY KEY,
 registry_id integer NOT NULL REFERENCES registry_names(id),
 label text NOT NULL,
 proposed name COLLATE "C",
 reference name COLLATE "C",
 names_equal boolean,
 precedes boolean,
 different boolean,
 CONSTRAINT identifier_equal CHECK(nameeq(proposed,reference)=names_equal),
 CONSTRAINT identifier_precedes CHECK(namelt(proposed,reference)=precedes),
 CONSTRAINT identifier_distinct CHECK((proposed IS DISTINCT FROM reference)=different)
);
CREATE TABLE identifier_preferences (
 id integer PRIMARY KEY,
 registry_id integer NOT NULL REFERENCES registry_names(id),
 label text NOT NULL,
 primary_name name COLLATE "C",
 fallback_name name COLLATE "C",
 use_primary boolean NOT NULL,
 selected text COLLATE "C",
 smallest text COLLATE "C",
 largest text COLLATE "C",
 changed text COLLATE "C",
 CONSTRAINT identifier_selected CHECK((CASE WHEN use_primary THEN primary_name ELSE fallback_name END)::text COLLATE "C"=selected),
 CONSTRAINT identifier_smallest CHECK(LEAST(primary_name,fallback_name)::text COLLATE "C"=smallest),
 CONSTRAINT identifier_largest CHECK(GREATEST(primary_name,fallback_name)::text COLLATE "C"=largest),
 CONSTRAINT identifier_changed CHECK(NULLIF(primary_name,fallback_name)::text COLLATE "C"=changed)
);
CREATE TABLE identifier_imports (
 id integer PRIMARY KEY,
 registry_id integer NOT NULL REFERENCES registry_names(id),
 label text NOT NULL,
 source text,
 recorded text COLLATE "C",
 bypass boolean NOT NULL,
 CONSTRAINT identifier_import CHECK(CASE WHEN bypass THEN true ELSE source::name::text COLLATE "C"=recorded END)
);
