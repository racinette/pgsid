-- INTERSECT keeps the left arm's groups: output rows are left-branch
-- rows that also appear on the right, and set operations pair NULLs as
-- equal, so the absent-arm rows survive the intersection. The right
-- branch restricts to orders 2 and 3 — dense: order 2 unshipped
-- (absent), order 3 shipped (present).
-- @null-group 1*,2*
SELECT
  o.id      AS oid,   -- @notNull
  s.id      AS sid,   -- @nullable
  s.carrier           -- @nullable
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
INTERSECT
SELECT
  o.id,
  s.id,
  s.carrier
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
WHERE o.id IN (2, 3)
