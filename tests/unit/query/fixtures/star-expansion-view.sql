-- `SELECT *` must resolve columns the same way a named reference does.
--
-- A view's own catalog columns are all attnotnull=false, so expanding a star
-- straight from the catalog loses every guarantee — while `SELECT ap.id`
-- recovers it by analyzing the view definition. Star expansion and named
-- resolution have to go through the same path or they disagree.
SELECT *   -- @notNull   products.id
           -- @nullable  products.category_id
           -- @notNull   products.sku
           -- @notNull   products.name
           -- @notNull   products.price
FROM active_products
