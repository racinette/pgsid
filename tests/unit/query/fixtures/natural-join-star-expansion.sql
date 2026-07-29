-- NATURAL JOIN is USING over every commonly-named column, so it merges the
-- same way. products and order_items share only `id`.
SELECT *   -- @notNull    merged id
           -- @nullable   products.category_id
           -- @notNull    products.sku
           -- @notNull    products.name
           -- @notNull    products.price
           -- @nullable   products.deleted_at
           -- @notNull    order_items.order_id
           -- @notNull    order_items.product_id
           -- @notNull    order_items.quantity
           -- @notNull    order_items.unit_price
FROM products p NATURAL JOIN order_items oi
