-- A ray inside a complement: (5,inf) misses the arm's excluded point
-- because the anchor IS the point and the ray is OPEN — every witnessed
-- value clears 5 strictly, so `a <> 5` held on all of them.
SELECT
  o -- @notNull
FROM caine
WHERE a > 5
