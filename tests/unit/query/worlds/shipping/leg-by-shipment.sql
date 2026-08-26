-- Both parameters land in predicates, so a NULL binding is a question the
-- engine has to answer rather than a value it passes through.
SELECT
  l.origin,
  l.destination,
  l.distance_km
FROM shipment_legs l
WHERE l.shipment_id = $1
  AND l.seq = $2
