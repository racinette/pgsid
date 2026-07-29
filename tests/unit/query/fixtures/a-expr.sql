-- A_Expr: comparisons and math → nullable (three-valued logic)
SELECT
  id = 1       AS c1,  -- 
  val > 0      AS c2,  -- 
  id + 1       AS c3,  -- 
  id IN (1, 2) AS c4   -- 
FROM t
