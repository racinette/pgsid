-- Subquery in FROM with internal GROUP BY and join structure.
-- The outer query inherits the subquery's per-column nullability.
SELECT
  sub.order_id    AS order_id,    -- 
  sub.item_count  AS item_count,  -- 
  sub.total       AS total        -- 
FROM (
  SELECT
    oi.order_id                       AS order_id,
    count(*)                          AS item_count,
    sum(oi.unit_price * oi.quantity)  AS total
  FROM order_items oi
  GROUP BY oi.order_id
) sub
