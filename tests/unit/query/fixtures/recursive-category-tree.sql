-- Recursive CTE walking a self-referencing category hierarchy.
-- The self-reference resolves by induction: the base term makes depth 0, and a
-- step from a non-null depth produces a non-null depth, so every row at every
-- level has one. COALESCE over a non-null base-case column stays non-null.
WITH RECURSIVE cat_tree AS (
  SELECT id, parent_id, slug, name, 0 AS depth
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.slug, c.name, ct.depth + 1
  FROM categories c
  JOIN cat_tree ct ON c.parent_id = ct.id
)
SELECT
  id                    AS id,          -- @notNull
  COALESCE(name, slug)  AS display,     -- @notNull
  depth                 AS depth,       -- @notNull
  parent_id             AS parent_id    -- @nullable
FROM cat_tree
