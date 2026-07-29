-- RowExpr / ArrayExpr: → non-null (constructors never NULL)
SELECT
  ROW(id, val)        AS c1,  -- @notNull
  ARRAY[name, val]    AS c2   -- @notNull
FROM t
