-- A returned row exists only when both the target action and its USING
-- incident matched. The second binding is an admissible no-row control; it
-- changes cardinality, not the nullability of a row that was returned.
-- @args [1, "suppressed"]
-- @args [999, "suppressed"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
DELETE FROM dispatch_actions AS d
USING grid_incidents AS i
WHERE d.incident_id = i.id
  AND d.id = $1
  AND i.status = $2
RETURNING
  d.id,                 -- @notNull
  d.operator_name,      -- @notNull
  d.outcome,            -- @nullable
  i.id,                 -- @notNull
  i.summary             -- @nullable
