-- @args [1, "2024-03-01"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  r.id,            -- @notNull
  r.requested_on,  -- @notNull
  r.ready_on       -- @nullable
FROM reservations r
WHERE r.priority >= $1
  AND r.requested_on <= $2
