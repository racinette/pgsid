-- ADVERSARIAL FINDING 2 — rank 1, notNull unsoundness.
--
-- Falsifying data: none needed; the statement is its own witness.
-- Observed: PostgreSQL returns (NULL, 'y', 1) — the BEFORE trigger set
-- NEW.a := NULL after the statement's value was chosen — while the engine
-- claims `a` notNull from the written-value map (a literal was written).
--
-- Suspected mechanism: nothing in the engine models the write path's
-- rewriting stage. `attachInsertWrittenColumns` (nullability-walk.ts) reduces
-- VALUES cells to the values the STATEMENT names, and the catalog flag
-- describes the stored row; between the two sits BEFORE ROW / INSTEAD OF
-- triggers and DO INSTEAD rules, none of which the snapshot captures at all.
-- The same falsification lands three ways: this one, an UPDATE whose SET
-- expression the trigger overwrites, and a DO INSTEAD rule that redirects the
-- write to a different table (rule-rewrites-written-row.sql,
-- instead-of-trigger-view.sql).
--
-- The annotations below are the claims the engine CURRENTLY makes.
INSERT INTO trig_t (id, a, b) VALUES (1, 'x', 'y')
RETURNING
  a,   -- @notNull  <-- FALSE: the BEFORE trigger nulls it
  b,   -- @notNull
  id   -- @notNull
