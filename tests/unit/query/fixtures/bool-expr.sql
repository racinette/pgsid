-- BoolExpr: AND → nullable; OR → nullable; NOT EXISTS → non-null
SELECT
  (id = 1 AND val IS NOT NULL)       AS c1,  -- @nullable
  (id = 1 OR val IS NOT NULL)        AS c2,  -- @nullable
  NOT EXISTS (SELECT 1 FROM t)       AS c3,  -- @notNull
  NOT (id = 5)                       AS c4   -- @nullable
FROM t
