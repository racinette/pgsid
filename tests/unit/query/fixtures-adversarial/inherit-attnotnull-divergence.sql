-- ADVERSARIAL FINDING 3 — rank 1, notNull unsoundness.
--
-- Falsifying data: `INSERT INTO inh_c VALUES (1, NULL);` — a row in the
-- CHILD, whose `a` carries no NOT NULL.
-- Observed: PostgreSQL returns (1, NULL). `SELECT ... FROM inh_p` scans the
-- inheritance tree, and the child's row is in it.
--
-- Suspected mechanism: `resolveColumnNotNull` answers from the named
-- relation's own `pg_attribute.attnotnull`, which is the right question only
-- for a relation with no children. `ALTER TABLE ONLY <parent> ALTER <col> SET
-- NOT NULL` is accepted by PostgreSQL (measured) and produces exactly this
-- divergence: parent attnotnull=true, child attnotnull=false. CHECK
-- constraints do NOT have the hole — they are copied to every child's own
-- pg_constraint and cannot be dropped or invalidated there (measured), which
-- is why `resolveCheckConstraints` is safe as written.
--
-- Note the `ONLY` variant of this query is sound: it scans the parent alone,
-- where the flag does hold.
SELECT
  p.id,  -- @nullable
  p.a    -- @notNull  <-- FALSE: the child's row has NULL there
FROM inh_p p
