-- VALUES: with NULL and non-null literals
SELECT
  a   AS c1,  -- 
  b   AS c2   -- 
FROM (VALUES (1, NULL), (2, 3)) v(a, b)
