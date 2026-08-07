-- DDL for the fourth adversarial sweep's quarantine fixtures.
--
-- Deliberately NOT folded into `fixtures/schema.sql`: these objects exist to
-- falsify claims the engine currently makes, and folding them in before the
-- fix phase would put the fixture suites under construction it cannot yet
-- answer for. The fix phase folds them in, as the three prior ones did.

-- ---------------------------------------------------------------------------
-- Section A — the strict short-circuit and the FROM item's column list.
--
-- `ROWS FROM` expands its arms in lockstep to the LONGEST one and NULL-pads
-- every shorter arm. A function returning a NOT NULL DOMAIN is the one shape
-- whose DECLARED column reading carries a notNull, so it is the one that can
-- be contradicted by the padding.
-- ---------------------------------------------------------------------------

-- Set-returning, non-strict: `sw4_dom_rows(1)` beside a three-row arm is
-- padded twice.
CREATE FUNCTION sw4_dom_rows(n integer) RETURNS SETOF nn_text
  LANGUAGE sql AS $$ SELECT 'v'::nn_text FROM generate_series(1, n) $$;

-- The same, STRICT: a NULL argument returns NO rows at all, which is the
-- case `callCanShortCircuit` excludes via `returnsSet` — "no rows means
-- nothing to contradict". ROWS FROM padding is where rows come back anyway.
CREATE FUNCTION sw4_dom_srf(n integer) RETURNS SETOF nn_text
  LANGUAGE sql STRICT AS $$ SELECT 'v'::nn_text FROM generate_series(1, n) $$;

-- The TABLE(...) spelling of the same declared reading.
CREATE FUNCTION sw4_tab_srf(n integer) RETURNS TABLE(a nn_text, b integer)
  LANGUAGE sql STRICT AS $$ SELECT 'v'::nn_text, n $$;

-- ---------------------------------------------------------------------------
-- Sections C and D — a foreign key whose REFERENCED side is a PARTITIONED
-- parent.
--
-- `ONLY <partitioned parent>` scans NO rows: a partitioned table holds none
-- of its own. The key's guarantee ("a matching row exists in sw4_pp") is
-- therefore silent about the slice `ONLY sw4_pp` produces, and the engine
-- reads the scan mode of the REFERENCING relation only.
--
-- Inheritance is the opposite way round and safe: a foreign key's target
-- index covers the parent's OWN rows, so `ONLY inh_par` is exactly where the
-- match lives.
-- ---------------------------------------------------------------------------

-- TWO partitions, deliberately: PostgreSQL clones a foreign key referencing a
-- partitioned table once per PARTITION (`conparentid` points at the declared
-- one, `confrelid` at the partition), and a clone says nothing about which
-- partition a referencing row lands in.
CREATE TABLE sw4_pp (id integer NOT NULL PRIMARY KEY, k text) PARTITION BY RANGE (id);
CREATE TABLE sw4_pp1 PARTITION OF sw4_pp FOR VALUES FROM (0) TO (100);
CREATE TABLE sw4_pp2 PARTITION OF sw4_pp FOR VALUES FROM (100) TO (200);

CREATE TABLE sw4_pref (
  id   integer NOT NULL PRIMARY KEY,
  p_id integer NOT NULL REFERENCES sw4_pp(id)
);

-- The inheritance control: same shape, an inheritance parent instead.
CREATE TABLE sw4_ip (id integer NOT NULL PRIMARY KEY, k text);
CREATE TABLE sw4_ic () INHERITS (sw4_ip);
CREATE TABLE sw4_iref (
  id   integer NOT NULL PRIMARY KEY,
  p_id integer NOT NULL REFERENCES sw4_ip(id)
);

-- A key whose two columns share a NAME, so a USING/NATURAL join synthesises
-- exactly the key equality.
CREATE TABLE sw4_c (id integer NOT NULL PRIMARY KEY, v text);
CREATE TABLE sw4_r (
  rid integer NOT NULL PRIMARY KEY,
  id  integer NOT NULL REFERENCES sw4_c(id),
  v   text
);

-- ---------------------------------------------------------------------------
-- Section B — argument substitution. A default that is itself a defaulted
-- call, and the volatile / session-dependent spellings.
-- ---------------------------------------------------------------------------

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

-- A record-returning function for the `ROWS FROM` column-definition-list arm,
-- whose body proves a value the padding then takes away.
CREATE FUNCTION sw4_rec(n integer) RETURNS SETOF record
  LANGUAGE sql AS $$ SELECT 'v'::text, 1 FROM generate_series(1, n) $$;

-- A relation sharing no column name with anything, so a NATURAL join against
-- it merges nothing and the walk records no qual for it.
CREATE TABLE sw4_none (zz integer);

-- ---------------------------------------------------------------------------
-- Finding 7 — a non-strict function returning a NOT NULL DOMAIN whose body is
-- NULL-PRESERVING. Every such function in `fixtures/schema.sql` returns a
-- CONSTANT, so the class the parameter contract misses is unreached there
-- rather than merely unlikely.
-- ---------------------------------------------------------------------------

CREATE FUNCTION sw4_dom_id(x text) RETURNS nn_text
  LANGUAGE sql AS $$ SELECT x::nn_text $$;
CREATE FUNCTION sw4_dom_echo(x text) RETURNS nn_text
  LANGUAGE sql AS $$ SELECT x $$;

-- The WIDE control: nothing catalog-visible says this rejects NULL.
CREATE FUNCTION sw4_raiser(x text) RETURNS text LANGUAGE plpgsql AS
  $$ BEGIN IF x IS NULL THEN RAISE 'nope'; END IF; RETURN x; END $$;
