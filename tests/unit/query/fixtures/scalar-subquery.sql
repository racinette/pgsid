-- Scalar subqueries (EXPR_SUBLINK)
SELECT
  (SELECT id FROM t)           AS c1,  -- 
  (SELECT count(*) FROM t)     AS c2,  -- 
  (SELECT max(val) FROM t)     AS c3,  -- 
  (SELECT id FROM t LIMIT 1)   AS c4   -- 
FROM t
