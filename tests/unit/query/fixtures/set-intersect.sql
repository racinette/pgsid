-- Set operations: INTERSECT → AND of operands
SELECT
  val   AS result   -- @nullable
FROM t
INTERSECT
SELECT
  val
FROM u
