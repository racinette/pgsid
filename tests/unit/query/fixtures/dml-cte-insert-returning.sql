-- INSERT with WITH clause + RETURNING with expressions.
-- The INSERT's RETURNING references the target table (order_items), which
-- is always required. CTEs in the WITH clause feed the SELECT part.
WITH source AS (
  SELECT id, price FROM products WHERE deleted_at IS NULL
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT 1, id, 1, price FROM source
RETURNING
  id                        AS id,          -- 
  product_id                AS product_id,  -- 
  quantity                  AS quantity,    -- 
  COALESCE(unit_price, 0)   AS price        -- 
