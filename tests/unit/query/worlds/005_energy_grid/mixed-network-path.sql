-- Only the seed is restricted to energized nodes. The recursive term can add
-- offline descendants, so its weaker timestamp contract weakens the fixed
-- point even though the seed timestamp is proved present.
-- @params none
-- @null-groups none
-- @param-rejections none
WITH RECURSIVE mixed_path AS (
  SELECT n.id, n.node_code, n.energized_at, n.service_marker
  FROM grid_nodes n
  WHERE n.id = 1 AND n.node_state = 'energized'
  UNION ALL
  SELECT child.id, child.node_code, child.energized_at, child.service_marker
  FROM mixed_path path
  JOIN grid_nodes child ON child.parent_id = path.id
)
SELECT
  p.id,           -- @notNull
  p.node_code,    -- @notNull
  p.energized_at, -- @nullable
  p.service_marker -- @nullable
FROM mixed_path p
