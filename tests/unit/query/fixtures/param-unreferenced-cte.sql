-- An execution-time rejection site inside an UNREFERENCED CTE never runs,
-- in any data state (adversarial-2 finding 9): PostgreSQL does not execute
-- a non-data-modifying CTE nobody references, so the frame-offset site —
-- which raises even over EMPTY input when referenced
-- (param-window-frame-offset.sql pins that direction) — never evaluates
-- and the NULL binding is accepted. The collector now walks unreferenced
-- SELECT CTEs for parameter NUMBERS only (visitStatementWithCtes), so no
-- claim is filed and the nullable reading holds universally. The wide
-- reachability question this narrows from is recorded beside the claim
-- semantics in docs/argument-nullability.md.
-- @args [null]
-- @param 1 nullable
WITH unused AS (
  SELECT count(*) OVER (ORDER BY a ROWS BETWEEN $1 PRECEDING AND CURRENT ROW) FROM gs
)
SELECT 1 AS one  -- @notNull
