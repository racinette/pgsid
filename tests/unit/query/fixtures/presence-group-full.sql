-- FULL JOIN: two extension units from one join, one group per side. The
-- shipments side's absent arm is witnessed (dense orders 2/4 are
-- unshipped). The orders side's absent arm is NOT witnessable:
-- shipments.order_id is a NOT NULL foreign key, so every shipment matches
-- an order — recorded on the discriminants, which is also what exempts
-- the group's absent arm (the derived exemption: a group's absent arm is
-- unwitnessable exactly when every discriminant's NULL is).
-- @unwitnessable 0: shipments.order_id is a NOT NULL FK onto orders, so the orders side always matches and never extends
-- @unwitnessable 1: same FK: an orders-side extension would need an orphan shipment
-- @null-group 0*,1*
-- @null-group 2*,3*
SELECT
  o.id      AS oid,      -- @nullable
  o.status  AS status,   -- @nullable
  s.id      AS sid,      -- @nullable
  s.carrier AS carrier   -- @nullable
FROM orders o
FULL JOIN shipments s ON s.order_id = o.id
