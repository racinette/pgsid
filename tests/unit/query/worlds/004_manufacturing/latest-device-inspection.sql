-- The correlated lateral chooses one completed inspection as a unit. The CTE
-- re-exports that optional identity and its state-proved evidence together.
-- @params none
-- @null-group 1*,2*,3*
-- @param-rejections none
WITH device_latest AS (
  SELECT
    d.serial_number,
    latest.inspection_id,
    latest.inspected_at,
    latest.outcome
  FROM devices d
  LEFT JOIN LATERAL (
    SELECT
      i.id AS inspection_id,
      i.inspected_at,
      i.outcome
    FROM inspections i
    WHERE i.device_id = d.id
      AND i.status = 'completed'
    ORDER BY i.inspected_at DESC
    LIMIT 1
  ) latest ON true
)
SELECT
  d.serial_number, -- @notNull
  d.inspection_id, -- @nullable
  d.inspected_at,  -- @nullable
  d.outcome        -- @nullable
FROM device_latest d
