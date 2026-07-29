-- Recursive CTE result fed into a UNION with a non-recursive query.
-- The recursive self-reference produces conservative nullable columns
-- for expressions derived from the recursive part (e.g. depth+1 → A_Expr).
-- UNION combines with a literal query; the AND of both sides determines
-- the final nullability.
WITH RECURSIVE cat_tree AS (
  SELECT id, name, 0 AS depth
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, ct.depth + 1
  FROM categories c
  JOIN cat_tree ct ON c.parent_id = ct.id
)
SELECT
  id    AS id,      -- 
  name  AS name,    -- 
  depth AS depth   -- 
FROM cat_tree
UNION
SELECT 0, 'root', 0
ORDER BY depth, id
