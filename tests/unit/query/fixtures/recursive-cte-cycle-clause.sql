-- A recursive CTE's CYCLE clause appends TWO generated columns: the cycle mark
-- and the path array. Both are always populated by the recursion machinery, so
-- both are non-null, and `SELECT *` over the CTE must expand to both.
WITH RECURSIVE tree AS (
  SELECT c.id, c.parent_id
  FROM categories c
  WHERE c.parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
) CYCLE id SET is_cycle USING path
SELECT *   -- @notNull
           -- @nullable
           -- @notNull
           -- @notNull
FROM tree
