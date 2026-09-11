-- Both the seed and recursive terms select the energized state, so the state
-- CHECK proves every fixed-point row carries its energizing timestamp.
-- @args [1]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
WITH RECURSIVE energized_path AS (
  SELECT n.id, n.node_code, n.energized_at, n.service_marker, 0 AS depth
  FROM grid_nodes n
  WHERE n.id = $1 AND n.node_state = 'energized'
  UNION ALL
  SELECT child.id, child.node_code, child.energized_at, child.service_marker, path.depth + 1
  FROM energized_path path
  JOIN grid_nodes child ON child.parent_id = path.id
  WHERE child.node_state = 'energized'
)
SELECT
  p.id,           -- @notNull
  p.node_code,    -- @notNull
  p.energized_at, -- @notNull
  p.service_marker, -- @notNull
  p.depth         -- @notNull
FROM energized_path p
