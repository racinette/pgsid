-- LEFT JOIN LATERAL: the lateral body is an ordinary extension unit, and
-- given presence the inner analysis speaks through the correlation —
-- sid/carrier are the inner shipment row's NOT NULL columns, so both
-- discriminate. dense: orders 2/4 find no shipment and the LATERAL's
-- empty result null-extends (absent); orders 1/3 match (present).
-- @null-group 1*,2*
SELECT
  o.id      AS oid,      -- @notNull
  l.sid     AS sid,      -- @nullable
  l.carrier AS carrier   -- @nullable
FROM orders o
LEFT JOIN LATERAL (
  SELECT s.id AS sid, s.carrier FROM shipments s WHERE s.order_id = o.id
) l ON true
