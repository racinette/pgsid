-- A parameter-driven refilter: `s.carrier = $1` is a strict comparison,
-- so every returned row proves the extension gone WHATEVER the binding —
-- a NULL binding just returns nothing. The unit promotes, no group
-- forms, and the columns read notNull. The UPS binding provides the
-- liveness rows (dense shipment 1); the unbound all-NULL run returns no
-- rows and asserts nothing here.
-- @args ["UPS"]
-- @param 1 nullable
SELECT
  o.id      AS oid,      -- @notNull
  s.id      AS sid,      -- @notNull
  s.carrier AS carrier   -- @notNull
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
WHERE s.carrier = $1
