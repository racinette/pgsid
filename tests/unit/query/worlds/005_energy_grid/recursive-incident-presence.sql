-- A recursive energized path crosses into a grouped incident summary. The
-- summary row is optional as a unit: node_id discriminates its presence, and
-- every summary output is NULL when no incident group exists.
-- @args [1]
-- @param 1 nullable
-- @null-group 1*,2,3
-- @param-rejections none
WITH RECURSIVE energized_path AS (
  SELECT n.id, n.node_code
  FROM grid_nodes n
  WHERE n.id = $1 AND n.node_state = 'energized'
  UNION ALL
  SELECT child.id, child.node_code
  FROM energized_path path
  JOIN grid_nodes child ON child.parent_id = path.id
  WHERE child.node_state = 'energized'
), incident_summary AS (
  SELECT i.node_id, max(i.resolved_at) AS last_resolved, max(i.summary) AS last_summary
  FROM grid_incidents i
  GROUP BY i.node_id
)
SELECT
  p.node_code,       -- @notNull
  s.node_id,         -- @nullable
  s.last_resolved,   -- @nullable
  s.last_summary     -- @nullable
FROM energized_path p
LEFT JOIN incident_summary s ON s.node_id = p.id
