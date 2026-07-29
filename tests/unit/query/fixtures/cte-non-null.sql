-- CTE with non-null output → outer ref non-null
WITH x AS (
  SELECT id, val FROM t
)
SELECT
  id   AS c1,  -- @notNull
  val  AS c2   -- @nullable
FROM x
