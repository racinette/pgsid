-- FULL JOIN through USING: the merged column is supplied by whichever
-- side is present — a FULL row always has one — so it reads notNull and
-- joins NO group (no producer, by construction). Each side's remainders
-- form their own unit: customers' with email discriminating and name a
-- nullable member (dense customer 2's order row shows name NULL beside a
-- non-null email — the member/discriminant split executing); orders'
-- with both columns discriminating, its absent arm witnessed by customer
-- 5, who has no order. The customers side extends too — the generated
-- state draws order ids outside the customer id set — so BOTH groups'
-- arms are execution-witnessed with no exemption needed. (An earlier
-- draft recorded the customers side unwitnessable from the hand-written
-- states alone; the staleness check corrected it within one run.)
-- @null-group 1*,2
-- @null-group 3*,4*
SELECT
  id,             -- @notNull
  c.email,        -- @nullable
  c.name,         -- @nullable
  o.customer_id,  -- @nullable
  o.status        -- @nullable
FROM customers c
FULL JOIN orders o USING (id)
