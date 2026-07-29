-- Window functions: rank products by price within category, and count.
-- rank() is a window aggregate the walk treats conservatively as nullable
-- (imprecise but never wrong). count(*) OVER is special-cased to non-null.
SELECT
  p.id   AS product_id,   -- 
  p.name AS name,         -- 
  p.price AS price,       -- 
  rank()   OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS price_rank,  -- 
  count(*) OVER (PARTITION BY p.category_id)                       AS cat_count    -- 
FROM products p
WHERE p.deleted_at IS NULL
