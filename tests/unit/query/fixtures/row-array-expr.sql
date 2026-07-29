-- RowExpr / ArrayExpr: → non-null (constructors never NULL)
SELECT
  ROW(id, val)        AS c1,  -- 
  ARRAY[id, val]      AS c2   -- 
FROM t
