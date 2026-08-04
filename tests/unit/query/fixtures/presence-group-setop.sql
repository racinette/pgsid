-- R2 closed: a UNION's group is the branches' agreement. Every output
-- row comes from exactly one branch at the same indices, so the shipments
-- unit survives the UNION ALL — both branches claim {1,2} and both
-- discriminate both columns. (While the restriction stood, this fixture
-- pinned the engine emitting nothing here.)
-- @null-group 1*,2*
SELECT
  o.id      AS oid,   -- @notNull
  s.id      AS sid,   -- @nullable
  s.carrier           -- @nullable
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
UNION ALL
SELECT
  o.id,
  s.id,
  s.carrier
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
