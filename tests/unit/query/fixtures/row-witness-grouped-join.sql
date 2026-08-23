-- A LEFT JOIN that cannot have extended, proven by a THIRD FROM item.
--
-- `w` is CROSS JOIN LATERAL, so an order with no items produces no `w` row and
-- is dropped. Every surviving order therefore HAS an order_items row carrying
-- its id — that is the row witness. `tot` groups the same table by the same
-- column, and a grouped relation holds a row for exactly the keys its source
-- holds, so the join onto it always matches and `tot.n` is flat notNull.
--
-- This is the shape foreign-key entailment deliberately cannot reach: it reads
-- the two relations a join relates and says so in its own comment, and here
-- the evidence sits in a relation the join never mentions.
--
-- The three columns after it are that same join with ONE thing changed on the
-- grouped side, and PostgreSQL returns NULL for each. They are gated where the
-- witness is not, and the asymmetry is the whole design: the witness needs
-- `non-empty implies the row exists`, which anything that only removes rows
-- preserves, while the grouped side needs `the row exists implies the group is
-- here`, which those same operations destroy.
--
-- `dense` supplies what each needs: order 4 has no items, order 2 has items
-- and no shipment, and no order has more than five items or an item over
-- quantity 100.
--
-- @planner-keeps 1: the tot join settles by row witness. The planner is not
--   answering the same question — its outer-join removal fires only when the
--   inner side is UNREFERENCED, and `tot.n` is projected, so it keeps the join
--   whether or not the join can extend.
SELECT
  o.id            AS order_id,   -- @notNull
  tot.n           AS total_n,    -- @notNull

  -- A WHERE inside the grouped item removes rows before grouping, and can
  -- remove precisely the witnessed one. No item has quantity over 100.
  filtered.n      AS filtered_n, -- @nullable

  -- HAVING drops the group after forming it.
  having_side.n   AS having_n,   -- @nullable

  -- A different source relation: the witness is about order_items and says
  -- nothing about shipments.
  ship.n          AS ship_n      -- @nullable
FROM orders o

CROSS JOIN LATERAL (
  SELECT 1 AS one FROM order_items oi WHERE oi.order_id = o.id
) w

LEFT JOIN (
  SELECT oi2.order_id AS k, count(*) AS n FROM order_items oi2 GROUP BY oi2.order_id
) tot ON tot.k = o.id

LEFT JOIN (
  SELECT oi3.order_id AS k, count(*) AS n
  FROM order_items oi3 WHERE oi3.quantity > 100 GROUP BY oi3.order_id
) filtered ON filtered.k = o.id

LEFT JOIN (
  SELECT oi4.order_id AS k, count(*) AS n
  FROM order_items oi4 GROUP BY oi4.order_id HAVING count(*) > 5
) having_side ON having_side.k = o.id

LEFT JOIN (
  SELECT s.order_id AS k, count(*) AS n FROM shipments s GROUP BY s.order_id
) ship ON ship.k = o.id
