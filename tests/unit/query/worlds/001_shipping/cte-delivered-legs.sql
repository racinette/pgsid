-- The constraint reasoning happens inside the common table expression and the
-- outer query has to carry its conclusion back out through the re-export.
-- @params none
-- @null-groups none
-- @param-rejections none
WITH delivered AS (
  SELECT s.id, s.delivered_at
  FROM shipments s
  WHERE s.status = 'delivered'
)
SELECT
  d.id,           -- @notNull
  d.delivered_at, -- @notNull
  l.origin        -- @nullable
FROM delivered d
LEFT JOIN shipment_legs l ON l.shipment_id = d.id
