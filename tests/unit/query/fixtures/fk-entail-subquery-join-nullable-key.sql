-- Gate: the joining key must be NOT NULL, one hop in as much as at the anchor.
--
-- `products.category_id` references categories and may be NULL, and a NULL key
-- matches nothing — so an uncatalogued product ends the chain with no row at
-- all. dense sells one, and the subquery is NULL there.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT cat.name
    FROM products p
    JOIN categories cat ON cat.id = p.category_id
    WHERE p.id = oi.product_id
  )      AS cname   -- @nullable
FROM order_items oi
