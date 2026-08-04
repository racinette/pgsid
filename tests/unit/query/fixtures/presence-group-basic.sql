-- The canonical presence group: shipments extends as one unit, so its bare
-- columns are NULL together exactly when an order has no shipment. sid and
-- carrier are discriminants (NOT NULL given present — NULL ⟺ absent);
-- tracking_no is a member only: nullable even when present (dense shipment 1
-- carries NULL tracking on the PRESENT arm, which is what separates the two
-- claim strengths). dense witnesses both arms: orders 2 and 4 are unshipped,
-- 1 and 3 shipped.
-- @null-group 1*,2*,3
SELECT
  o.id          AS oid,          -- @notNull
  s.id          AS sid,          -- @nullable
  s.carrier     AS carrier,      -- @nullable
  s.tracking_no AS tracking      -- @nullable
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
