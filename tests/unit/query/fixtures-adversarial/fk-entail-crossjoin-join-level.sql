-- SWEEP-4 FINDING 2, second site (rank 1). Quarantined: `cid` is the
-- engine's CURRENT claim and is WRONG.
--
-- Falsifying data: the same as the sibling fixture — one customer, one order
-- on it, one shipment on that order, `tags` EMPTY.
-- Observed: one row, `cid` NULL.
--
-- The unseen CROSS JOIN reaches the promotion through `joinCannotExtendSide`
-- here rather than through `foreignKeyEntailedAlias`: the outer FULL join is
-- read as unable to extend its right side (every shipment has an order, and
-- the side is read as preserving every order), which makes the inner join
-- `incomingRequired`, which lets the key on `o.customer_id` promote
-- `customers`. Both readings call the same `subtreePreserves`, so one fix
-- closes both — but the second site is what decides the blast radius.
--
-- Suspected mechanism: nullability-walk.ts `joinCannotExtendSide` →
-- `subtreePreserves`, over a `scope.joins` that never received the CROSS
-- JOIN.
--
-- Attack-catalog entry: C.
SELECT
  c.id AS cid   -- @notNull   <- FALSE
FROM shipments s
FULL JOIN (orders o FULL JOIN (customers c CROSS JOIN tags g) ON o.customer_id = c.id)
  ON s.order_id = o.id
