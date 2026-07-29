-- Window function + CTE + COALESCE + strict function + nested subquery.
-- Combines: CTE with LEFT JOIN, window function (rank, count OVER),
-- strict function over nullable column, COALESCE with subquery fallback.
WITH product_reviews AS (
  SELECT p.id, p.name, p.price, p.deleted_at, r.rating
  FROM products p
  LEFT JOIN reviews r ON r.product_id = p.id
)
SELECT
  pr.id       AS product_id,   -- 
  pr.name     AS name,         -- 
  rank() OVER (PARTITION BY pr.id ORDER BY pr.rating DESC) AS rank,  -- 
  count(*) OVER (PARTITION BY pr.id) AS review_count,  -- 
  COALESCE(
    lower_strict(pr.name),
    (SELECT c.name FROM categories c WHERE c.id = 1)
  ) AS safe_name  -- 
FROM product_reviews pr
WHERE pr.deleted_at IS NULL
