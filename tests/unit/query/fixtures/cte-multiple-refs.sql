-- CTE referenced multiple times
WITH x AS (
  SELECT id, val FROM t
)
SELECT
  a.id   AS c1,  -- 
  b.val  AS c2   -- 
FROM x a
  INNER JOIN x b ON a.id = b.id
