-- Set operations: UNION → AND of operands
SELECT
  val   AS result   -- @nullable
FROM t
UNION
SELECT
  val
FROM u
