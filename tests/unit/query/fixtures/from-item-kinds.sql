-- @unwitnessable 2: SETOF row types carry no NOT NULL constraints, but the function's body selects NOT NULL columns and cannot emit NULL
-- @unwitnessable 3: same row-type erasure as srf_id
-- @unwitnessable 4: same: the LATERAL function's sku is NOT NULL at the base table
-- FROM-item kinds other than a plain table: VALUES, set-returning functions,
-- LATERAL, and DISTINCT ON.
--
-- Set-returning function columns are resolved from the return type, but come
-- out nullable on purpose: a SETOF <table> result carries the table's row
-- type, and NOT NULL constraints do not travel with it. See
-- table-function-return-types.sql for the full rule.
SELECT DISTINCT ON (v.a)
  -- VALUES: each column is the AND across all rows, so a single NULL in one
  -- row makes the column nullable.
  v.a                     AS values_notnull,   -- @notNull
  v.b                     AS values_nullable,  -- @nullable

  -- Set-returning function in FROM — see above.
  g.id                    AS srf_id,           -- @nullable
  g.quantity              AS srf_qty,          -- @nullable

  -- LATERAL on the optional side of a LEFT JOIN: nullable because the
  -- subquery may produce no row for a given outer row.
  lat.sku                 AS lateral_sku,      -- @nullable
  COALESCE(lat.sku, 'n/a') AS safe_lateral     -- @notNull
FROM (VALUES (1, NULL), (2, 3)) v(a, b)
CROSS JOIN get_order_items(1) g
LEFT JOIN LATERAL (
  SELECT p.sku FROM products p WHERE p.id = v.a LIMIT 1
) lat ON true
ORDER BY v.a
