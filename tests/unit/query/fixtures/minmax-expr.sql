-- MinMaxExpr (GREATEST/LEAST): → nullable
SELECT
  GREATEST(id, val)   AS c1,  -- 
  LEAST(id, val)      AS c2   -- 
FROM t
