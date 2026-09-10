-- Two optional legs hang off one shipment, so an outer join sits under an
-- outer join sits under an inner one, and each level extends the last.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  s.id,         -- @notNull
  c.name,       -- @notNull
  a.origin,     -- @nullable
  b.destination -- @nullable
FROM shipments s
JOIN carriers c ON c.id = s.carrier_id
LEFT JOIN shipment_legs a ON a.shipment_id = s.id AND a.seq = 1
LEFT JOIN shipment_legs b ON b.shipment_id = s.id AND b.seq = 2
