-- USING and presence groups: the merged column is drawn from whichever
-- side is present, so it never extends with the optional unit and carries
-- no producer — excluded by construction, and notNull here because the
-- required side always supplies it. The optional side's REMAINING columns
-- still group; deleted_at rides along as a nullable member. (USING (id)
-- equates customer and order ids — structurally what the fixture needs:
-- dense customers 1-4 pair with orders 1-4, customer 5 finds no order 5,
-- the absent arm.)
-- @null-group 1*,2*,3*,4
SELECT
  id,             -- @notNull
  o.customer_id,  -- @nullable
  o.status,       -- @nullable
  o.placed_at,    -- @nullable
  o.deleted_at,   -- @nullable
  c.email         -- @notNull
FROM customers c
LEFT JOIN orders o USING (id)
