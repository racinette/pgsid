-- DDL for the second adversarial sweep's quarantine fixtures.
--
-- Deliberately NOT folded into fixtures/schema.sql: the fixtures beside it
-- record the claims the engine CURRENTLY makes, several of which PostgreSQL
-- falsifies, and the suite must stay green until the fix phase graduates
-- them. Everything here was created and measured against PGlite (PG18)
-- during the sweep; the per-fixture headers name what each entity is for.

-- Finding 5 — search_path. app_s.t shadows public.t under
-- `SET search_path = app_s, public`, with a different column list; app_only
-- exists only in app_s.
CREATE SCHEMA app_s;
CREATE TABLE app_s.t (zzz integer NOT NULL, qqq text NOT NULL, www text);
CREATE TABLE app_s.app_only (o1 integer NOT NULL, o2 text);

-- Finding 7 — a SETOF function whose element type is a NOT NULL domain.
-- Called in the TARGET LIST beside a longer SRF, PostgreSQL pads it.
CREATE FUNCTION one_sku() RETURNS SETOF non_empty_text LANGUAGE sql AS $$
  SELECT 'only'::non_empty_text $$;

-- Finding 8 — the mechanism-B gate over an inheritance tree. The NOT NULL
-- lives on the parent ONLY; rows live in the unconstrained child.
CREATE TABLE pnn_p (id integer NOT NULL, a text);
CREATE TABLE pnn_c () INHERITS (pnn_p);
ALTER TABLE ONLY pnn_p ALTER COLUMN a SET NOT NULL;

-- Findings 9, 10 — a plain subject for the frame-offset and grouping-set
-- shapes (fixtures/schema.sql's tables carry CHECKs that would confuse the
-- reading).
CREATE TABLE gs (a integer NOT NULL, b text NOT NULL, c text NOT NULL);
CREATE TABLE gs2 (d integer NOT NULL, e text NOT NULL);

-- Finding 13 — an alias whose name is also a composite COLUMN of the same
-- relation. `(p).*` is the parenthesized (value) spelling, which PostgreSQL
-- resolves to the COLUMN.
CREATE TABLE cc (id integer NOT NULL, p sku_pair);
