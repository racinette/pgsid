-- EXCEPT keeps the left arm's groups verbatim: output rows ARE
-- left-branch rows (the origins discipline, applied to groups). The
-- right branch removes only order 1's row, so dense still witnesses
-- both arms — orders 2/4 unshipped (absent), order 3 shipped (present).
-- @null-group 1*,2*
SELECT
  o.id      AS oid,   -- @notNull
  s.id      AS sid,   -- @nullable
  s.carrier           -- @nullable
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
EXCEPT
SELECT
  o.id,
  s.id,
  s.carrier
FROM orders o JOIN shipments s ON s.order_id = o.id
WHERE o.id = 1
