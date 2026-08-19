-- The join-level fact composing with itself, which is what makes it a fact
-- about joins rather than a special case.
--
-- The first FULL JOIN cannot extend its right side: every item has an order,
-- and `orders` is a whole relation nothing has filtered, so no item is left
-- unmatched. Every row that join emits therefore carries a stored order —
-- including the order-only rows, where the order is what is present — and
-- every one of those carries a NOT NULL `customer_id`.
--
-- The second FULL JOIN reads that: each of its left rows has a customer key,
-- `customers` is unfiltered, so no left row is unmatched and the join never
-- extends its right side. `c.id` is non-null in every state.
--
-- What the composition does NOT prove is anything about the columns of the
-- side this join DOES extend: a customer with no orders produces a row with
-- `o.id` and `oi.id` both NULL, which dense and uniform return.
--
-- No planner divergence declared: the key chain settles SIDES, not whole
-- joins. Both FULL JOINs keep one genuinely extending side (an order with
-- no items, a customer with no orders), so the join-level counts agree
-- with the planner — the walk's advantage lives at the side level, where
-- it types `c.id` notNull from keys the planner does not read, which a
-- join-granular count cannot see.
SELECT
  c.id    AS cid,        -- @notNull
  o.id    AS oid,        -- @nullable
  oi.id   AS oiid        -- @nullable
FROM order_items oi
FULL JOIN orders o ON oi.order_id = o.id
FULL JOIN customers c ON o.customer_id = c.id
