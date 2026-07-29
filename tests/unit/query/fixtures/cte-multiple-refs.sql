-- CTE referenced multiple times
WITH x AS (
  SELECT id, val FROM t
)
SELECT
  a.id   AS c1,  -- @notNull
  b.val  AS c2   -- @nullable
FROM x a
  INNER JOIN x b ON a.id = b.id
