-- @unwitnessable 0: the subquery scans the same table as the outer query: empty exactly when the fixture returns no rows, so the NULL coincides with rowlessness
-- @unwitnessable 2: max(val) over the same table the outer scans; its zero-input NULL coincides with the fixture returning nothing
-- @unwitnessable 3: same single-table linkage as c1
-- Scalar subqueries (EXPR_SUBLINK)
SELECT
  (SELECT id FROM t)           AS c1,  -- @nullable
  (SELECT count(*) FROM t)     AS c2,  -- @notNull
  (SELECT max(val) FROM t)     AS c3,  -- @nullable
  (SELECT id FROM t LIMIT 1)   AS c4   -- @nullable
FROM t
