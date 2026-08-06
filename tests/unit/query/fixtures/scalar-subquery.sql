-- @unwitnessable 0: the subquery scans the same table as the outer query: empty exactly when the fixture returns no rows, so the NULL coincides with rowlessness
-- @unwitnessable 3: same single-table linkage as c1
-- Scalar subqueries (EXPR_SUBLINK)
--
-- c3 aggregates `name` rather than `val` because an aggregate has a SECOND
-- route to NULL that c1's and c4's linkage does not: max is NULL over a
-- non-empty input whose values are all NULL. c1 raises with more than one
-- row, so the fixture is live only under `sparse` — whose single t row has a
-- NULL name and a non-NULL val. Over `val` this claim had no witness at all
-- and carried a reason that mistook it for c1's coincidence.
SELECT
  (SELECT id FROM t)           AS c1,  -- @nullable
  (SELECT count(*) FROM t)     AS c2,  -- @notNull
  (SELECT max(name) FROM t)    AS c3,  -- @nullable
  (SELECT id FROM t LIMIT 1)   AS c4   -- @nullable
FROM t
