-- Window functions: rank products by price within category, and count.
-- rank() assigns a position to every row in the partition, so it is never NULL
-- (imprecise but never wrong). count(*) OVER is special-cased to non-null.
SELECT
  p.id   AS product_id,   -- @notNull
  p.name AS name,         -- @notNull
  p.price AS price,       -- @notNull
  rank()   OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS price_rank,  -- @notNull
  count(*) OVER (PARTITION BY p.category_id)                       AS cat_count    -- @notNull
FROM products p
WHERE p.deleted_at IS NULL
