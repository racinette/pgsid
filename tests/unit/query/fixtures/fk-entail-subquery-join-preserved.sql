-- The anchor row does not always need the join to MATCH: it needs to survive
-- it, and an outer join that preserves the anchor's side does that on its own.
--
-- `order_items.order_id` settles the order, and the LEFT JOIN then keeps that
-- order whatever happens on the customers side — so the subquery returns its
-- row and `orders.status`, NOT NULL at the base table, comes back with it.
-- Nothing about `customers` is needed here, and nothing is asked of it.
--
-- The second column makes that concrete: the same subquery reading a column
-- from the side the join CAN extend is nullable, and stays so. Surviving the
-- join is a fact about the anchor row, not about the row's other half.
--
-- The third is the arm on its own. There the customers side is an INNER join
-- onto addresses, so the key that would prove a MATCH proves nothing — the
-- customer it names may have been dropped for having no address. Preservation
-- is the only thing left holding the claim up, and it holds: the order is
-- still there, with NULLs beside it.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT o.status
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = oi.order_id
  )      AS st,     -- @notNull
  (
    SELECT c.name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = oi.order_id
  )      AS cname,  -- @nullable
  (
    SELECT o.status
    FROM orders o
    LEFT JOIN (customers c JOIN addresses a ON a.customer_id = c.id)
      ON c.id = o.customer_id
    WHERE o.id = oi.order_id
  )      AS st2     -- @notNull
FROM order_items oi
