-- A shipment always has a carrier: the key is NOT NULL and validated, so the
-- inner join cannot drop the row and cannot leave the carrier side absent. A
-- leg may not exist at all, so everything the leg contributes arrives
-- null-extended — including a column the leg computes for itself.
SELECT
  s.id,
  c.name,
  l.origin,
  l.billable_km
FROM shipments s
JOIN carriers c ON c.id = s.carrier_id
LEFT JOIN shipment_legs l ON l.shipment_id = s.id
