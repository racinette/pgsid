-- Three constraints overlap on the two date columns, and the status filter
-- selects the arm that makes both of them non-null. Reaching that conclusion
-- needs the constraints read together rather than one at a time, which is what
-- the overlap is here to exercise.
SELECT
  s.id,
  s.status,
  s.shipped_at,
  s.delivered_at,
  l.destination
FROM shipments s
LEFT JOIN shipment_legs l ON l.shipment_id = s.id AND l.seq = 1
WHERE s.status = 'delivered'
