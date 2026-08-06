-- FULL JOIN, and the asymmetry a foreign key creates in one. The shipments
-- side is a genuine extension unit — dense's unshipped orders 2 and 4 witness
-- its absent arm — while the ORDERS side never extends at all:
-- shipments.order_id is a NOT NULL foreign key onto orders, so an orders-side
-- extension would need an orphan shipment and the key forbids one.
--
-- So one FULL JOIN yields ONE group, not two. The engine reads the key now
-- (the imprecision-closure charter's class B); before that, both of the orders
-- columns carried an @unwitnessable reason and the group they formed was
-- exempt by derivation from them. This is the FULL-JOIN arm of the
-- entailment: neither side is proven present, and what licenses the reading
-- is that the SHIPMENTS side is made optional by exactly this join, so its own
-- extension produces rows where the orders side is present rather than absent.
-- @null-group 2*,3*
SELECT
  o.id      AS oid,      -- @notNull
  o.status  AS status,   -- @notNull
  s.id      AS sid,      -- @nullable
  s.carrier AS carrier   -- @nullable
FROM orders o
FULL JOIN shipments s ON s.order_id = o.id
