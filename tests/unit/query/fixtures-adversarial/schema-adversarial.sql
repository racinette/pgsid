-- DDL for the second adversarial sweep's quarantine fixtures.
--
-- Deliberately NOT folded into fixtures/schema.sql: the fixtures beside it
-- record the claims the engine CURRENTLY makes, several of which PostgreSQL
-- falsifies, and the suite must stay green until the fix phase graduates
-- them. Everything here was created and measured against PGlite (PG18)
-- during the sweep; the per-fixture headers name what each entity is for.

-- Finding 1 — partition row movement. An UPDATE through the parent that
-- moves a row to another partition is DELETE+INSERT, so the DESTINATION
-- partition's BEFORE **INSERT** trigger fires and rewrites NEW (measured).
-- mv_2's trigger nulls `a` and rescues a NULL `b`.
CREATE TABLE mv_p (id integer NOT NULL, a text, b text NOT NULL) PARTITION BY RANGE (id);
CREATE TABLE mv_1 PARTITION OF mv_p FOR VALUES FROM (0) TO (100);
CREATE TABLE mv_2 PARTITION OF mv_p FOR VALUES FROM (100) TO (200);
CREATE FUNCTION mv_fn() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN NEW.a := NULL; NEW.b := coalesce(NEW.b, 'rescued'); RETURN NEW; END $$;
CREATE TRIGGER mv_before BEFORE INSERT ON mv_2
  FOR EACH ROW EXECUTE FUNCTION mv_fn();

-- Finding 2 — CHECK … NO INHERIT. The entailment soundness argument is that
-- a parent's CHECK is copied into every child's own pg_constraint; a
-- NO INHERIT constraint is never copied, and `connoinherit` is not captured.
-- ni_p carries the bare form, ni2_p the conditional (discriminated) form.
CREATE TABLE ni_p (id integer NOT NULL, x text, CHECK (x IS NOT NULL) NO INHERIT);
CREATE TABLE ni_c () INHERITS (ni_p);
CREATE TABLE ni2_p (id integer NOT NULL, status text NOT NULL, note text,
  CONSTRAINT ni2_note CHECK (status <> 'open' OR note IS NOT NULL) NO INHERIT);
CREATE TABLE ni2_c () INHERITS (ni2_p);

-- Finding 3 — a child may define its OWN generation expression for an
-- inherited column (accepted by PostgreSQL; every other divergence route
-- was measured REJECTED — see the findings doc's negative results).
CREATE TABLE gen_p (a integer NOT NULL, d integer GENERATED ALWAYS AS (a * 2) STORED);
CREATE TABLE gen_c (d integer GENERATED ALWAYS AS (nullif(a, a)) STORED) INHERITS (gen_p);

-- Finding 5 — search_path. app_s.t shadows public.t under
-- `SET search_path = app_s, public`, with a different column list; app_only
-- exists only in app_s.
CREATE SCHEMA app_s;
CREATE TABLE app_s.t (zzz integer NOT NULL, qqq text NOT NULL, www text);
CREATE TABLE app_s.app_only (o1 integer NOT NULL, o2 text);

-- Finding 6 — the LANGUAGE sql body's DML path. Both functions target
-- relations the top-level walk handles (an INSTEAD OF view, a DO INSTEAD
-- rule table from fixtures/schema.sql) through the body-inlining route.
CREATE FUNCTION body_ins_view(p text) RETURNS text LANGUAGE sql AS $$
  INSERT INTO iot_v (id, k) VALUES (99, p) RETURNING lit $$;
CREATE FUNCTION body_ins_rule() RETURNS text LANGUAGE sql AS $$
  INSERT INTO rule_src (id, a) VALUES (7, 'a') RETURNING a $$;

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

-- Finding 11 — infinite temporal values in NOT NULL columns.
CREATE TABLE inf_t (id integer NOT NULL, ts timestamp NOT NULL, iv interval NOT NULL);

-- Finding 13 — an alias whose name is also a composite COLUMN of the same
-- relation. `(p).*` is the parenthesized (value) spelling, which PostgreSQL
-- resolves to the COLUMN.
CREATE TABLE cc (id integer NOT NULL, p sku_pair);
