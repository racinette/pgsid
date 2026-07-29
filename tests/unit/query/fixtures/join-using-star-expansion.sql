-- JOIN ... USING merges the join column: `SELECT *` emits it ONCE, first,
-- followed by the left relation's remaining columns and then the right's.
--
-- The merge only affects star expansion. Both constituents stay individually
-- addressable as p.id and oi.id — see join-using-merged-column.sql.
--
-- For an inner join the merged column is non-null if EITHER side's column is:
-- both rows are present and their values are equal by construction.
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
FROM products p JOIN order_items oi USING (id)
