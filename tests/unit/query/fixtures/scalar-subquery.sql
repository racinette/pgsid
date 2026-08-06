-- @unwitnessable 0: the subquery scans the same table as the outer query: empty exactly when the fixture returns no rows, so the NULL coincides with rowlessness
-- @unwitnessable 2: NOT the same linkage as c1 — max is also NULL over a
--   non-empty input whose values are all NULL, which is a data property. c1
--   raises with more than one t row, so the fixture is live only where t
--   holds exactly one, and sparse is the only such state; its row's val is
--   'x'. A data gap: measured, a single t row with a NULL val witnesses this.
-- @unwitnessable 3: same single-table linkage as c1
-- Scalar subqueries (EXPR_SUBLINK)
SELECT
  (SELECT id FROM t)           AS c1,  -- @nullable
  (SELECT count(*) FROM t)     AS c2,  -- @notNull
  (SELECT max(val) FROM t)     AS c3,  -- @nullable
  (SELECT id FROM t LIMIT 1)   AS c4   -- @nullable
FROM t
