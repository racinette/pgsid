-- The OVERSHOOT control for finding 2: an unrecorded CROSS JOIN in the
-- REFERENCING side is genuinely harmless, and recording it must not cost the
-- promotion.
--
-- The cross join multiplies the join's LEFT side, and the claim is about the
-- RIGHT one: the key still says every order carries a customer, however many
-- times each order is repeated. `subtreePreserves` is asked about the
-- REFERENCED alias, so the new structural entry changes nothing here.
--
-- That is what this fixture checks, because the cheapest wrong fix is one that
-- refuses whenever any qual-less join is in scope — it would look like the
-- same fix and would cost every claim of this shape.
--
-- `products` rather than `tags` deliberately: it has rows in every non-empty
-- state, so the claim is falsifiable rather than vacuous. The emptying
-- version is the point of the sibling fixtures, and it belongs on the other
-- side of the join.
SELECT
  c.id AS cid   -- @notNull  (the key holds for every order, repeated or not)
FROM (orders o CROSS JOIN products p)
LEFT JOIN customers c ON c.id = o.customer_id
