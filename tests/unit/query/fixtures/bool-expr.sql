-- BoolExpr: AND/OR are three-valued, but NULL can only enter through an
-- operand — with every operand non-null the result is a plain boolean.
SELECT
  (id = 1 AND val IS NOT NULL)       AS c1,  -- @notNull
  (id = 1 OR val IS NOT NULL)        AS c2,  -- @notNull
  NOT EXISTS (SELECT 1 FROM t)       AS c3,  -- @notNull
  NOT (id = 5)                       AS c4   -- @notNull
FROM t
