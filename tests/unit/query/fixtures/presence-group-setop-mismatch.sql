-- The UNION negative: the second branch COALESCEs carrier, so its
-- column 2 is not a bare member and the branch claims only a
-- single-member unit — below the floor, no branch group, and therefore
-- no combined group however good the first branch's is. The columns stay
-- flat-nullable (branch one's arms). The stale direction fires if the
-- engine ever claims a group here.
SELECT
  o.id      AS oid,   -- @notNull
  s.id      AS sid,   -- @nullable
  s.carrier           -- @nullable
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
UNION ALL
SELECT
  o.id,
  s.id,
  COALESCE(s.carrier, 'unknown')
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
