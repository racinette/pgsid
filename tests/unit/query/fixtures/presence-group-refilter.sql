-- The refilter negative: a strict WHERE conjunct over the optional side
-- kills every NULL-extended row, promotion makes the unit effectively
-- required, and NO group forms — its absent arm does not survive to the
-- output. The columns read notNull instead. If the engine ever claimed a
-- group here, the walk test's missing-annotation direction would fail;
-- if it stopped promoting, the per-column claims would.
SELECT
  o.id      AS oid,      -- @notNull
  s.id      AS sid,      -- @notNull
  s.carrier AS carrier   -- @notNull
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
WHERE s.carrier IS NOT NULL
