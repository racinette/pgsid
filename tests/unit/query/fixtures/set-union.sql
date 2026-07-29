-- Set operations: UNION → AND of operands
SELECT
  val   AS result   -- 
FROM t
UNION
SELECT
  val
FROM u
