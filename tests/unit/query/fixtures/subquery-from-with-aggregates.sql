-- Subquery in FROM with an internal CTE + join structure.
-- Tests CTE resolution inside a subquery scope (the CTE is local to the
-- subquery, not visible to the outer query).
SELECT
  sub.product_name AS product_name,   -- @notNull
  sub.review_count AS review_count,   -- @notNull
  sub.avg_rating   AS avg_rating      -- @nullable
FROM (
  SELECT
    p.name                       AS product_name,
    count(r.id)                  AS review_count,
    avg(r.rating)                AS avg_rating
  FROM products p
  LEFT JOIN reviews r ON r.product_id = p.id
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, p.name
) sub
