-- An execution-time rejection site inside an UNREFERENCED CTE never runs,
-- in any data state (adversarial-2 finding 9): PostgreSQL does not execute
-- a non-data-modifying CTE nobody references, so the frame-offset site —
-- which raises even over EMPTY input when referenced
-- (param-window-frame-offset.sql pins that direction) — never evaluates
-- and the NULL binding is accepted. The collector walks unreferenced SELECT
-- CTEs for parameter numbers and BIND-TIME facts only, so no claim is filed
-- for this site and the nullable reading holds universally. The bind-time
-- half is param-unreferenced-cte-mechanism-a.sql, whose claim the same gate
-- once dropped with this one. The wide reachability question this narrows
-- from is recorded beside the claim semantics in
-- docs/argument-nullability.md.
-- @args [null]
-- @param 1 nullable
WITH unused AS (
  SELECT count(*) OVER (ORDER BY a ROWS BETWEEN $1 PRECEDING AND CURRENT ROW) FROM gs
)
SELECT 1 AS one  -- @notNull
