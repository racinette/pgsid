-- Scalar subqueries (EXPR_SUBLINK)
SELECT
  (SELECT id FROM t)           AS c1,  -- @nullable
  (SELECT count(*) FROM t)     AS c2,  -- @notNull
  (SELECT max(val) FROM t)     AS c3,  -- @nullable
  (SELECT id FROM t LIMIT 1)   AS c4   -- @nullable
FROM t
