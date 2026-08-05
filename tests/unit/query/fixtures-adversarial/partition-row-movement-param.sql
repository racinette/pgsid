-- FINDING 1, param face (rank 3) — the same command crossing seen from the
-- argument contract. mechanism B gates on the tree hooks, and the tree's
-- beforeRow is {"insert"} while the statement's command is "update", so
-- the gate does not fire and `b`'s NOT NULL constraint makes $1 notNull.
-- The destination partition's BEFORE INSERT trigger then RESCUES the NULL
-- (`NEW.b := coalesce(NEW.b, 'rescued')`), so no execution raises.
--
-- Measured, both directions:
--   moving  (SET id = id + 100, b = $1) → ACCEPTED, returns [101, 'rescued']
--   static  (SET b = $1)                → RAISES not-null violation on mv_1
-- The static control is what makes this a defect rather than an unlucky
-- data state: for the moving statement there is NO execution in which the
-- NULL binding raises, and `notNull` is an existential claim
-- (docs/argument-nullability.md, "Claim semantics").
--
-- Mechanism: param-nullability.ts columnRejection — the same per-command
-- hook question as the output side.
-- @args [null]
-- @param 1 notNull  <-- FALSIFIED (the binding is accepted)
UPDATE mv_p SET id = id + 100, b = $1 WHERE id = 1
RETURNING
  id,  -- @notNull
  b    -- @notNull
