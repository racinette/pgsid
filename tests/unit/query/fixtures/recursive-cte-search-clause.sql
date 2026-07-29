-- A recursive CTE's SEARCH clause appends a generated ordering column to the
-- CTE's output. It appears in neither branch's target list, so it has to come
-- from the SEARCH clause itself — and `SELECT *` over the CTE must expand to
-- it. The generated column is a row-path array the recursion always populates.
WITH RECURSIVE tree AS (
  SELECT c.id, c.parent_id, c.name
  FROM categories c
  WHERE c.parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.name
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
) SEARCH DEPTH FIRST BY id SET ordercol
SELECT *   -- @notNull
           -- @nullable
           -- @notNull
           -- @notNull
FROM tree
