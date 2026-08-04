-- The same optional column referenced twice: both output positions carry
-- the same value, so both join the group and both discriminate — the
-- contract is positional and each position independently claims NULL ⟺
-- absent, which per-row execution verifies trivially (they are equal).
-- @null-group 1*,2*
SELECT
  o.id AS oid,   -- @notNull
  s.id AS sid,   -- @nullable
  s.id AS sid2   -- @nullable
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
