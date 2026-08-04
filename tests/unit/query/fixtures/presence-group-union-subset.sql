-- UNION subset matching (the second recorded imprecision, closed): the
-- first branch's unit is {1,2,3}, the second's only {1,2} — its COALESCE
-- drops tracking_no from membership. A group restricted to any member
-- subset stays sound within its branch, so the pair's INTERSECTION
-- {1,2} holds over the union, both columns discriminating in both
-- branches. Exact-set matching emitted nothing here while the
-- imprecision stood. dense witnesses both arms in both branches.
-- @null-group 1*,2*
SELECT
  o.id      AS oid,   -- @notNull
  s.id      AS sid,   -- @nullable
  s.carrier,          -- @nullable
  s.tracking_no       -- @nullable
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
UNION ALL
SELECT
  o.id,
  s.id,
  s.carrier,
  COALESCE(s.tracking_no, 'x')
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
