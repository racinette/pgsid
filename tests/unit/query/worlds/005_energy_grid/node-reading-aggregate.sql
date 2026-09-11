-- HAVING filters completed groups, not their input rows. COUNT manufactures a
-- value for a node with no reading, while the filtered MAX remains nullable;
-- the window expression numbers the surviving aggregate rows.
-- @args [0]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  n.id, -- @notNull
  count(r.id) FILTER (WHERE r.quality = 'accepted'), -- @notNull
  max(r.demand_mw) FILTER (WHERE r.quality = 'accepted'), -- @nullable
  row_number() OVER (ORDER BY n.id) -- @notNull
FROM grid_nodes n
LEFT JOIN meters m ON m.node_id = n.id
LEFT JOIN meter_readings r ON r.meter_id = m.id
GROUP BY n.id
HAVING count(r.id) >= $1
