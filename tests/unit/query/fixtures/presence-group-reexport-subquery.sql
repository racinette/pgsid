-- R1 closed, the subquery form: a bare re-export preserves the inner
-- analysis's row facts, so the inner LEFT JOIN's unit rides out of the
-- derived table — the group the engine could not see while groups were
-- root-only. dense: orders 2/4 unshipped (absent), 1/3 shipped (present).
-- @null-group 1*,2*
SELECT
  s.oid,       -- @notNull
  s.sid,       -- @nullable
  s.carrier    -- @nullable
FROM (
  SELECT o.id AS oid, sh.id AS sid, sh.carrier
  FROM orders o LEFT JOIN shipments sh ON sh.order_id = o.id
) s
