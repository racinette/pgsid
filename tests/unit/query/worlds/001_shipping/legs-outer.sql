-- A shipment always has a carrier: the key is NOT NULL and validated, so the
-- inner join cannot drop the row and cannot leave the carrier side absent. A
-- leg may not exist at all, so everything the leg contributes arrives
-- null-extended — including a column the leg computes for itself.
-- @params none
-- @null-group 2*,3
-- @param-rejections none
SELECT
  s.id,         -- @notNull
  c.name,       -- @notNull
  l.origin,     -- @nullable
  l.billable_km -- @nullable
FROM shipments s
JOIN carriers c ON c.id = s.carrier_id
LEFT JOIN shipment_legs l ON l.shipment_id = s.id
