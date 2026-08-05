-- The other half of the unreferenced-CTE gate (adversarial-3 finding 8).
-- The gate's licence is "never executed", and it was applied to the WALK,
-- which dropped all four mechanisms. Mechanism A is not an execution-time
-- mechanism: parse analysis types $1 from the cast it sits under, and Bind
-- rejects the NULL before anything runs — so this statement raises exactly
-- as its referenced control does, and the engine held that claim before the
-- sweep-2 fix and stopped. `reject`/`rejectFlow` do the gating now, so B, C
-- and the frame-offset site stay dropped (param-unreferenced-cte.sql pins
-- that direction) and A stays claimed. Measured identical in three further
-- shapes: NOT MATERIALIZED, a CTE referenced only from another unreferenced
-- one, and the cast nested inside a subquery in the CTE body.
-- @args [null]
-- @args ["x"]
-- @param 1 notNull
WITH unused AS (
  SELECT $1::nn_text AS z
)
SELECT 1 AS one  -- @notNull
