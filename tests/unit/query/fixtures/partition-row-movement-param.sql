-- The same command crossing seen from the argument contract (adversarial-2
-- finding 1, param face): mechanism B's gate on mv_p's tree hooks now asks
-- about INSERT triggers too for a partitioned UPDATE target, so b's NOT
-- NULL yields no claim for $1 — the destination's BEFORE INSERT trigger
-- RESCUES a NULL binding (`NEW.b := coalesce(NEW.b, 'rescued')`, measured:
-- the moving statement raises under NO binding, and notNull is an
-- existential claim). Conservative for a stationary UPDATE on the same
-- target, where the cost is a dropped claim, never a wrong one. The NULL
-- binding below exercises the rescue on every moved row.
-- @args ["bee"]
-- @args [null]
-- @param 1 nullable
UPDATE mv_p SET id = id + 100, b = $1 WHERE id < 100
RETURNING
  id,  -- @notNull
  b    -- @notNull
