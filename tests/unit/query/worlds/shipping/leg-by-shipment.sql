-- Both parameters land in predicates, so a NULL binding is a question the
-- engine has to answer rather than a value it passes through.
-- @args [1, 1]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  l.origin,      -- @notNull
  l.destination, -- @nullable
  l.distance_km  -- @nullable
FROM shipment_legs l
WHERE l.shipment_id = $1
  AND l.seq = $2
