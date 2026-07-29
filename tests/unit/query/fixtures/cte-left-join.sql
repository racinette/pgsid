-- CTE with internal LEFT JOIN → outer ref inherits nullability
WITH x AS (
  SELECT t.val AS v
  FROM t LEFT JOIN u ON u.t_id = t.id
)
SELECT
  v   AS c1   -- 
FROM x
