-- Querying a view: PG does not propagate attnotnull to view columns in
-- pg_attribute (views don't enforce NOT NULL), so the walk reads every view
-- column as nullable — correct and conservative.
SELECT
  ap.id           AS product_id,   -- 
  ap.category_id  AS category_id,  -- 
  ap.sku          AS sku,          -- 
  ap.name         AS name,         -- 
  ap.price        AS price         -- 
FROM active_products ap
