-- BoolExpr: AND → nullable; OR → nullable; NOT EXISTS → non-null
SELECT
  (id = 1 AND val IS NOT NULL)       AS c1,  -- 
  (id = 1 OR val IS NOT NULL)        AS c2,  -- 
  NOT EXISTS (SELECT 1 FROM t)       AS c3,  -- 
  NOT (id = 5)                       AS c4   -- 
FROM t
