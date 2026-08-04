-- DDL the quarantine fixtures in this directory need, over and above
-- `tests/unit/query/fixtures/schema.sql`.
--
-- It lives here rather than at the bottom of the fixture schema because this
-- directory is deliberately outside the suites' glob: the fixtures beside it
-- record claims the engine currently gets WRONG, so nothing here should run
-- under the green suite yet. Fold it into `fixtures/schema.sql` when the
-- fixtures graduate during the fix phase.

-- --------------------------------------------------------------------------
-- Write-path rewriting the engine does not model (finding 2).
-- --------------------------------------------------------------------------

-- A BEFORE trigger that nulls a column the statement wrote.
CREATE TABLE trig_t (id integer PRIMARY KEY, a text, b text NOT NULL);
CREATE FUNCTION trig_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.a := NULL; RETURN NEW; END $$;
CREATE TRIGGER trig_before BEFORE INSERT OR UPDATE ON trig_t
  FOR EACH ROW EXECUTE FUNCTION trig_fn();

-- A DO INSTEAD rule that redirects the write to another table.
CREATE TABLE rule_src (id integer NOT NULL, a text NOT NULL);
CREATE TABLE rule_dst (id integer, a text);
CREATE RULE r_ins AS ON INSERT TO rule_src DO INSTEAD
  INSERT INTO rule_dst VALUES (NEW.id, NULL) RETURNING id, a;

-- An INSTEAD OF trigger making a non-updatable view writable.
CREATE TABLE iot_base (id integer PRIMARY KEY, k text NOT NULL);
CREATE VIEW iot_v AS SELECT id, k, 'x'::text AS lit FROM iot_base;
CREATE FUNCTION iot_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO iot_base VALUES (NEW.id, NEW.k);
  NEW.k := NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER iot_t INSTEAD OF INSERT ON iot_v
  FOR EACH ROW EXECUTE FUNCTION iot_fn();

-- --------------------------------------------------------------------------
-- attnotnull divergence across an inheritance parent (finding 3).
-- `ALTER TABLE ONLY <parent> ALTER <col> SET NOT NULL` is accepted (measured);
-- the same statement for a PARTITIONED parent is refused, so partitions
-- cannot reach this shape.
-- --------------------------------------------------------------------------
CREATE TABLE inh_p (id integer, a text);
CREATE TABLE inh_c () INHERITS (inh_p);
ALTER TABLE ONLY inh_p ALTER COLUMN a SET NOT NULL;

-- --------------------------------------------------------------------------
-- bpchar: distinct TOKENS, equal VALUES (finding 4).
-- `'a'::char(4) = 'a '` is TRUE — bpchar comparison ignores trailing blanks
-- before the collation ever runs (measured).
-- --------------------------------------------------------------------------
CREATE TABLE bp (k char(4) NOT NULL, x text, CHECK (k = 'a ' OR x IS NOT NULL));
CREATE TABLE bp2 (k char(4) NOT NULL, x text,
  CHECK (CASE WHEN k = 'a' THEN x IS NULL WHEN k = 'a ' THEN x IS NOT NULL END));
-- The varchar control: no blank padding, so the tokens really are distinct
-- and no row can reach the shape above.
CREATE TABLE vc (k varchar(4) NOT NULL, x text, CHECK (k = 'a ' OR x IS NOT NULL));

-- --------------------------------------------------------------------------
-- STRICT is not TOTAL (finding 5).
-- --------------------------------------------------------------------------
CREATE FUNCTION strict_nullish(x text) RETURNS text
  LANGUAGE sql STRICT AS $$ SELECT NULL::text $$;
CREATE FUNCTION strict_nullish_pl(x text) RETURNS text
  LANGUAGE plpgsql STRICT AS $$ BEGIN RETURN NULL; END $$;
-- The realistic shape: a strict lookup whose row need not exist.
CREATE FUNCTION lookup_name(p integer) RETURNS text
  LANGUAGE sql STRICT AS $$ SELECT c.name FROM customers c WHERE c.id = p $$;
-- The same hole reached through an operator's backing function.
CREATE FUNCTION strict_none(a text, b text) RETURNS text
  LANGUAGE sql STRICT AS $$ SELECT NULL::text $$;
CREATE OPERATOR <-> (LEFTARG = text, RIGHTARG = text, FUNCTION = strict_none);

-- --------------------------------------------------------------------------
-- A non-null INITCOND fixes the EMPTY-input result only (finding 6).
-- --------------------------------------------------------------------------
CREATE FUNCTION nullify_sfunc(state bigint, val integer) RETURNS bigint
  LANGUAGE sql AS $$ SELECT NULL::bigint $$;
CREATE AGGREGATE agg_nullify(integer) (SFUNC = nullify_sfunc, STYPE = bigint, INITCOND = '0');
CREATE FUNCTION final_null(state bigint) RETURNS bigint
  LANGUAGE sql AS $$ SELECT NULL::bigint $$;
CREATE AGGREGATE agg_finalnull(integer)
  (SFUNC = count_it_sfunc, STYPE = bigint, INITCOND = '0', FINALFUNC = final_null);

-- --------------------------------------------------------------------------
-- Relations the catalog snapshot does not capture (finding 11).
-- The snapshot takes relkind 'r'/'v'/'m' in user namespaces only, so a
-- PARTITIONED table (relkind 'p') is invisible; so are temporary tables and
-- pg_catalog / information_schema, which the fixtures reach without DDL.
-- --------------------------------------------------------------------------
CREATE TABLE part_p (id integer NOT NULL, k text) PARTITION BY RANGE (id);
CREATE TABLE part_1 PARTITION OF part_p FOR VALUES FROM (0) TO (100);

-- --------------------------------------------------------------------------
-- A record-returning function for the column-definition-list shape
-- (finding 13).
-- --------------------------------------------------------------------------
CREATE FUNCTION rec_pairs() RETURNS SETOF record LANGUAGE sql
  AS $$ SELECT 1, 'a'::text $$;
