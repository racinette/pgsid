-- Set operations: INTERSECT → AND of operands
SELECT
  val   AS result   -- 
FROM t
INTERSECT
SELECT
  val
FROM u
