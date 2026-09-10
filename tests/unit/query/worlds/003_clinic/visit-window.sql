-- @args ["2025-01-01T00:00:00Z", "2025-04-01T00:00:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  v.id,            -- @notNull
  v.scheduled_at,  -- @notNull
  v.room           -- @nullable
FROM visits v
WHERE v.scheduled_at >= $1
  AND v.scheduled_at < $2
