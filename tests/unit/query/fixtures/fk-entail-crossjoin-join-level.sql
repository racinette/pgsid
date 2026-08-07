-- Finding 2's SECOND reading site, which is what decides its blast radius.
--
-- The unseen CROSS JOIN reaches the promotion through `joinCannotExtendSide`
-- here rather than through `foreignKeyEntailedAlias`: the outer FULL join is
-- read as unable to extend its right side (every shipment has an order, and
-- the side is read as preserving every order), which makes the inner join
-- `incomingRequired`, which lets the key on `o.customer_id` promote
-- `customers`.
--
-- Both readings call the same `subtreePreserves` over the same array, so one
-- record fixes both — but a fix verified only at the first site would have
-- left this one making the claim.
SELECT
  c.id AS cid   -- @nullable
FROM shipments s
FULL JOIN (orders o FULL JOIN (customers c CROSS JOIN tags g) ON o.customer_id = c.id)
  ON s.order_id = o.id
