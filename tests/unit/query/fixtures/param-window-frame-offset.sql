-- A window frame OFFSET is a rejection site of its own: a NULL bound
-- raises `frame starting offset must not be null` — for ROWS, RANGE and
-- GROUPS, in both directions, and even over empty input (all measured).
-- The register pins the sibling placement — LIMIT/OFFSET take NULL
-- legally — and a frame bound reads like the same shape while behaving
-- oppositely; the engine once claimed $1 nullable on exactly that
-- analogy. Execution-time like mechanism B, so no output narrowing. The
-- first binding is the control; the second witnesses the raise.
-- @unwitnessable 0: the frame always contains the current row and t.id is
--   NOT NULL, so the sum is never NULL on any surviving binding; the engine
--   stays conservative for every explicit frame by design.
-- @args [1]
-- @args [null]
-- @param 1 notNull
SELECT
  sum(t.id) OVER (ORDER BY t.id ROWS BETWEEN $1 PRECEDING AND CURRENT ROW) AS s
                      -- @nullable
FROM t
