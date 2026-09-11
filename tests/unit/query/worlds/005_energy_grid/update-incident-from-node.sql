-- The accepted-reading branch writes one of two optional status candidates.
-- Either candidate is admissible, but their joint absence reaches the
-- required target column and rejects the matched UPDATE row.
-- @args ["investigating", "open", 1]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @null-groups none
-- @param-reject 1,2
UPDATE grid_incidents AS i
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM meter_readings r
    WHERE r.id = i.reading_id AND r.quality = 'accepted'
  ) THEN coalesce($1::incident_status, $2::incident_status)
  ELSE 'open'::incident_status
END
FROM grid_nodes AS n
WHERE n.id = i.node_id
  AND i.id = $3
  AND EXISTS (
    SELECT 1 FROM meter_readings r
    WHERE r.id = i.reading_id AND r.quality = 'accepted'
  )
RETURNING
  i.id,        -- @notNull
  i.status,    -- @notNull
  n.node_code  -- @notNull
