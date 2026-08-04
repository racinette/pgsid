-- ADVERSARIAL FINDING 15 — rank 3, param-contract unsoundness.
--
-- @args [1]
-- @args [null]
--
-- Falsifying data: one `t` row.
-- Observed: with $1 = 1 the statement succeeds and returns a row (the
-- control); with $1 = NULL PostgreSQL raises
--   "frame starting offset must not be null"
-- while the engine claims $1 nullable — which the argument contract defines
-- as "binding NULL never raises".
--
-- Suspected mechanism: `collectParamFacts` / `rejectFlow`
-- (query/param-nullability.ts) recognise three rejection mechanisms — a
-- bind-time NOT NULL domain, an execution-time NOT NULL site, and value flow
-- into one. A window frame OFFSET is a fourth: PostgreSQL checks it per
-- partition and raises `ERRCODE_NULL_VALUE_NOT_ALLOWED` for a NULL, for
-- ROWS, RANGE and GROUPS alike, in both the PRECEDING and FOLLOWING bounds.
-- The register pins the sibling placement — LIMIT/OFFSET take NULL legally
-- (re-measured here, still true) — and a frame bound reads like the same
-- shape while behaving oppositely.
SELECT
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN $1 PRECEDING AND CURRENT ROW) AS s
                      -- @nullable
FROM t
-- @param 1 nullable   <-- FALSE: a NULL binding raises
