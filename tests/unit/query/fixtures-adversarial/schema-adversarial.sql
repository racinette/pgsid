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

-- Finding 8 — the mechanism-B gate over an inheritance tree. The NOT NULL
-- lives on the parent ONLY; rows live in the unconstrained child.
CREATE TABLE pnn_p (id integer NOT NULL, a text);
CREATE TABLE pnn_c () INHERITS (pnn_p);
ALTER TABLE ONLY pnn_p ALTER COLUMN a SET NOT NULL;

-- Finding 9 — the unreferenced-CTE fixture reads fixtures/schema.sql's gs
-- (graduated with finding 10). gs2 was a sweep-probe subject only.

-- Finding 13 — an alias whose name is also a composite COLUMN of the same
-- relation. `(p).*` is the parenthesized (value) spelling, which PostgreSQL
-- resolves to the COLUMN.
CREATE TABLE cc (id integer NOT NULL, p sku_pair);
