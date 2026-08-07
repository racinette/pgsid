-- What is LEFT of the fourth sweep's DDL after the fix phase folded the rest
-- into `fixtures/schema.sql`.
--
-- These objects belong to the mechanism sweeps that HELD — section B's
-- argument substitution (12 probes, nothing) and the section-C self-join
-- shapes. They produced no finding and reach no shape the fixture corpus
-- lacks, so they stay here to keep the probe round files runnable and retire
-- with this directory rather than graduating.

-- Section B — a default that is itself a defaulted call, and the volatile /
-- session-dependent / raising spellings.
CREATE FUNCTION sw4_def_inner(a integer DEFAULT nullif(1, 1)) RETURNS integer
  LANGUAGE sql AS $$ SELECT a $$;
CREATE FUNCTION sw4_def_outer(a integer, b integer DEFAULT sw4_def_inner())
  RETURNS nn_text LANGUAGE sql STRICT AS $$ SELECT 'x'::nn_text $$;
CREATE FUNCTION sw4_def_user(a integer, b text DEFAULT CURRENT_USER)
  RETURNS nn_text LANGUAGE sql STRICT AS $$ SELECT 'x'::nn_text $$;
CREATE FUNCTION sw4_def_vol(a integer, b double precision DEFAULT random())
  RETURNS nn_text LANGUAGE sql STRICT AS $$ SELECT 'x'::nn_text $$;
CREATE FUNCTION sw4_def_raise(a integer, b integer DEFAULT (1 / 0))
  RETURNS nn_text LANGUAGE sql STRICT AS $$ SELECT 'x'::nn_text $$;

-- An OVERLOADED name where one candidate defaults to NULL and is STRICT.
CREATE FUNCTION sw4_ovd(a integer, b integer DEFAULT NULL) RETURNS nn_text
  LANGUAGE sql STRICT AS $$ SELECT 'x'::nn_text $$;
CREATE FUNCTION sw4_ovd(a text) RETURNS nn_text
  LANGUAGE sql STRICT AS $$ SELECT 'y'::nn_text $$;

-- A defaulted argument feeding the BODY that is read back.
CREATE FUNCTION sw4_def_body(a integer, b text DEFAULT NULL) RETURNS text
  LANGUAGE sql AS $$ SELECT b $$;

-- A NOT NULL self-referencing key, for the self-join shapes.
CREATE TABLE sw4_self (
  id integer NOT NULL PRIMARY KEY,
  up integer NOT NULL REFERENCES sw4_self(id)
);
