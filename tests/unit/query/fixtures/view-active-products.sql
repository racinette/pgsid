-- Querying a view: PG does not propagate attnotnull to view columns in
-- pg_attribute (views don't enforce NOT NULL), so the walk reads every view
-- column as nullable — correct and conservative.
SELECT
  ap.id           AS product_id,   -- @nullable
  ap.category_id  AS category_id,  -- @nullable
  ap.sku          AS sku,          -- @nullable
  ap.name         AS name,         -- @nullable
  ap.price        AS price         -- @nullable
FROM active_products ap
