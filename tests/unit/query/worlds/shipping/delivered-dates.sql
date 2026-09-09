-- Three constraints overlap on the two date columns, and the status filter
-- selects the arm that makes both of them non-null. Reaching that conclusion
-- needs the constraints read together rather than one at a time, which is what
-- the overlap is here to exercise.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  s.id,           -- @notNull
  s.status,       -- @notNull
  s.shipped_at,   -- @notNull
  s.delivered_at, -- @notNull
  l.destination   -- @nullable
FROM shipments s
LEFT JOIN shipment_legs l ON l.shipment_id = s.id AND l.seq = 1
WHERE s.status = 'delivered'
