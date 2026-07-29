-- Window function in a CTE, referenced by an outer query with WHERE
-- promotion. The window column (rank) is conservatively nullable and is
-- used in COALESCE. count(*) OVER is always non-null. The CTE's LEFT JOIN
-- makes rating optional, but name stays non-null (required side).
WITH product_window AS (
  SELECT
    p.id,
    p.name,
    p.category_id,
    r.rating,
    rank() OVER (PARTITION BY p.id ORDER BY r.rating DESC) AS rnk,
    count(*) OVER (PARTITION BY p.id) AS review_count
  FROM products p
  LEFT JOIN reviews r ON r.product_id = p.id
)
SELECT
  pw.id                               AS product_id,    -- 
  pw.name                             AS product_name,  -- 
  pw.category_id                      AS category_id,   -- 
  COALESCE(pw.rnk, 0)                 AS safe_rank,     -- 
  lower_strict(pw.name)               AS lower_name,    -- 
  COALESCE(lower_strict(pw.name), 'x') AS safe_name,   -- 
  pw.review_count                     AS review_count   -- 
FROM product_window pw
WHERE pw.rnk = 1
