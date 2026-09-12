-- A pending reservation has no release timestamp, so its generated allocation
-- marker is the required actor. Its operational note remains optional.
-- @args [1]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  r.reservation_id,      -- @notNull
  r.actor_label,         -- @notNull
  r.released_at,         -- @alwaysNull
  r.allocation_marker,   -- @notNull
  r.reservation_note     -- @nullable
FROM reservations AS r
WHERE r.tenant_id = $1
  AND r.state = 'pending'
