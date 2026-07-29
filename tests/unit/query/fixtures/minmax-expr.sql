-- MinMaxExpr (GREATEST/LEAST): → nullable
SELECT
  GREATEST(id, val)   AS c1,  -- @nullable
  LEAST(id, val)      AS c2   -- @nullable
FROM t
