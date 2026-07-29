-- A_Expr: non-null when the operator is total (never NULL for non-null inputs)
-- and every operand is non-null. A nullable operand makes the result nullable.
SELECT
  id = 1       AS c1,  -- @notNull
  val > 'a'    AS c2,  -- @nullable
  id + 1       AS c3,  -- @notNull
  id IN (1, 2) AS c4   -- @notNull
FROM t
