-- Subquery in FROM with internal join structure
SELECT
  v   AS c1   -- 
FROM (
  SELECT t.val AS v
  FROM t LEFT JOIN u ON u.t_id = t.id
) sub
