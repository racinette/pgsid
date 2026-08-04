-- ADVERSARIAL FINDING 2 (third rendering) — rank 1, notNull unsoundness.
--
-- Falsifying data: none needed.
-- Observed: PostgreSQL returns (1, NULL, NULL). An INSTEAD OF trigger returns
-- the NEW row it chooses, and this one nulls `k`; `lit` — a literal in the
-- view definition — comes back NULL too, because RETURNING over an INSTEAD OF
-- trigger reports the trigger's NEW row and the view expression is never
-- evaluated.
--
-- Suspected mechanism: as trigger-rewrites-written-row.sql, with an extra
-- edge — the engine reaches `lit` through the view's parsed definition
-- (viewAsts), where it is an A_Const and therefore notNull. That reasoning is
-- sound for reads and unsound for INSTEAD OF writes.
INSERT INTO iot_v (id, k) VALUES (1, 'v')
RETURNING
  id,  -- @notNull
  k,   -- @notNull  <-- FALSE: the trigger nulls it
  lit  -- @notNull  <-- FALSE: the view expression is not evaluated
