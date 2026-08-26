-- The constraint reasoning happens inside the common table expression and the
-- outer query has to carry its conclusion back out through the re-export.
WITH delivered AS (
  SELECT s.id, s.delivered_at
  FROM shipments s
  WHERE s.status = 'delivered'
)
SELECT
  d.id,
  d.delivered_at,
  l.origin
FROM delivered d
LEFT JOIN shipment_legs l ON l.shipment_id = d.id
