-- Querying a view. PG does not propagate attnotnull to view columns in
-- pg_attribute (views don't enforce NOT NULL), so the catalog flag is
-- useless here — it reads false for every column. The walk instead analyzes
-- the view's stored definition and maps its output columns positionally,
-- recovering the base tables' nullability.
SELECT
  ap.id           AS product_id,   -- @notNull
  ap.category_id  AS category_id,  -- @nullable
  ap.sku          AS sku,          -- @notNull
  ap.name         AS name,         -- @notNull
  ap.price        AS price         -- @notNull
FROM active_products ap
