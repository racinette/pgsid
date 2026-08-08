-- Key entailment inside a CORRELATED SUBQUERY, with every relation renamed by
-- an alias column list.
--
-- `fk-entail-subquery-join-chain.sql` is this fixture without the renames, and
-- it is the control: the same two claims, the same two hops, the same
-- mechanisms. All that differs is that no relation here answers to the names
-- `pg_constraint` records the keys under.
--
-- Both hops must survive:
--
--   * the ANCHOR — `order_items.order_id` (here `oi.k1`) is a NOT NULL key
--     onto `orders.id` (here `o.j0`), so the order the WHERE names exists;
--   * the COMPOSITION — that order's `customer_id` (here `o.j1`) is a NOT NULL
--     key onto `customers.id` (here `c.m0`), and `customers` is unfiltered, so
--     the join matches for exactly that row and the scalar subquery returns
--     it. `customers.email` (here `c.m1`) is NOT NULL.
--
-- The two hops are read by different code paths, so a fixture renaming only
-- one of them would leave the other untested — which is why all three
-- relations carry a list.
SELECT
  oi.k0  AS oiid,   -- @notNull
  (
    SELECT c.m1
    FROM orders o(j0, j1)
    JOIN customers c(m0, m1) ON c.m0 = o.j1
    WHERE o.j0 = oi.k1
  )      AS email   -- @notNull
FROM order_items oi(k0, k1)
