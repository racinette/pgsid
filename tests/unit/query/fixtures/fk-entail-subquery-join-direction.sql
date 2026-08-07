-- Gate: the entailed relation must be the one CARRYING the key.
--
-- `shipments.order_id` is a NOT NULL key onto orders, which is the same fact
-- the chain rule reads — but here it is read from the wrong end. It says every
-- shipment has an order; it is silent about an order with no shipment, and
-- that is exactly the row the anchor settles. dense and uniform both return
-- items whose order was never shipped, and the subquery is empty for them.
SELECT
  oi.id  AS oiid,     -- @notNull
  (
    SELECT s2.carrier
    FROM orders o
    JOIN shipments s2 ON s2.order_id = o.id
    WHERE o.id = oi.order_id
  )      AS carrier   -- @nullable
FROM order_items oi
