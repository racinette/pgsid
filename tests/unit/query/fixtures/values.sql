-- VALUES: with NULL and non-null literals
SELECT
  a   AS c1,  -- @notNull
  b   AS c2   -- @nullable
FROM (VALUES (1, NULL), (2, 3)) v(a, b)
