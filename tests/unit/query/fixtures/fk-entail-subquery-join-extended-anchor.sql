-- Gate: an outer join preserves ONE side, and the anchor has to be on it.
--
-- Here the LEFT JOIN keeps every shipment and extends the ORDER — which is
-- the anchor. So the anchor row appears only where a shipment points at it,
-- and an item on an order that was never shipped finds nothing at all: dense
-- and uniform both return that row with the subquery NULL.
--
-- The qual cannot rescue it either. `o.id = s2.order_id` is the key read from
-- the wrong end — every shipment has an order, which is silent about an order
-- with no shipment — so there is no match to prove and no preserved side to
-- fall back on.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT o.status
    FROM shipments s2
    LEFT JOIN orders o ON o.id = s2.order_id
    WHERE o.id = oi.order_id
  )      AS st      -- @nullable
FROM order_items oi
