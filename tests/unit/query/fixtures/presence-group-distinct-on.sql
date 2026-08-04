-- DISTINCT ON emits a subset of input rows, each a real row, so
-- row-wise group facts survive untouched — one row per order here, and
-- dense still shows both arms: orders 2/4 keep their all-NULL shipment
-- side, orders 1/3 their present one.
-- @null-group 1*,2*
SELECT DISTINCT ON (o.id)
  o.id      AS oid,      -- @notNull
  s.id      AS sid,      -- @nullable
  s.carrier AS carrier   -- @nullable
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
ORDER BY o.id, s.id
