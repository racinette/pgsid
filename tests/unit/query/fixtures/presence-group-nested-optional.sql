-- Nested optionality, the R1 composition: TWO groups. The OUTER unit —
-- x absent nulls all three, oid alone discriminates it (sid/carrier can
-- be NULL with x present) — and the LIFTED inner unit: among present-x
-- rows sid/carrier are NULL together, and under the composed reading
-- each discriminates "the chain broke somewhere" (outer absent nulls
-- them too, consistently). The two factored unions intersect to exactly
-- the three realizable row states. (The second annotation was demanded
-- by the missing-annotation direction the day R1 closed, as the original
-- comment here predicted.)
-- @null-group 1*,2,3
-- @null-group 2*,3*
SELECT
  c.id      AS cid,      -- @notNull
  x.oid     AS oid,      -- @nullable
  x.sid     AS sid,      -- @nullable
  x.carrier AS carrier   -- @nullable
FROM customers c
LEFT JOIN (
  SELECT o.customer_id, o.id AS oid, s.id AS sid, s.carrier
  FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
) x ON x.customer_id = c.id
