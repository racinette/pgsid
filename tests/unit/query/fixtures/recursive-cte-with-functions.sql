-- Recursive CTE + COALESCE + strict function + scalar subquery.
-- The recursive self-reference produces nullable columns (conservative),
-- but the base-case columns (id, name, slug) are non-null, so COALESCE
-- and strict functions over them stay non-null. The scalar subquery
-- (count) is single-row-guaranteed → non-null.
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
  ct.id                     AS id,            -- 
  lower_strict(ct.name)     AS lower_name,    -- 
  COALESCE(ct.parent_id, 0) AS parent_or_zero, -- 
  ct.depth                  AS depth,         --  (WHERE ct.depth < 3 promotes it)
  (SELECT count(*) FROM products p
   WHERE p.category_id = ct.id AND p.deleted_at IS NULL) AS product_count  -- 
FROM cat_tree ct
WHERE ct.depth < 3
