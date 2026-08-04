-- RIGHT JOIN mirrors LEFT: the LEFT side is the extension unit. Pinned
-- because nothing else exercised JOIN_RIGHT's group formation. dense:
-- orders 2/4 have no shipment, so the shipments side extends (absent);
-- orders 1/3 are shipped (present).
-- @null-group 0*,1*
SELECT
  s.id      AS sid,      -- @nullable
  s.carrier AS carrier,  -- @nullable
  o.id      AS oid       -- @notNull
FROM shipments s
RIGHT JOIN orders o ON s.order_id = o.id
