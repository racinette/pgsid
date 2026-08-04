-- HAVING as a group refilter: HAVING is consulted like WHERE (Wave 1's
-- ungated evidence), so `s.id IS NOT NULL` over a grouping key kills the
-- all-extended (NULL, NULL) group, promotes the unit, and NO presence
-- group forms — the keys read notNull instead. The stale direction fires
-- if the engine ever claims a group here.
SELECT
  s.id      AS sid,      -- @notNull
  s.carrier AS carrier,  -- @notNull
  count(*)  AS n         -- @notNull
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
GROUP BY s.id, s.carrier
HAVING s.id IS NOT NULL
