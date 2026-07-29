-- A_Expr: comparisons and math → nullable (three-valued logic)
SELECT
  id = 1       AS c1,  -- @nullable
  val > 0      AS c2,  -- @nullable
  id + 1       AS c3,  -- @nullable
  id IN (1, 2) AS c4   -- @nullable
FROM t
