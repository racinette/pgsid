-- Either device key independently finds the same witnessed device. The scalar
-- lookup becomes NULL only when both keys are NULL, and the required device_id
-- then rejects the proposed inspection.
-- @args [50, 1, 1, "MX-100", "2026-02-01T10:00:00Z"]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 nullable
-- @param 4 nullable
-- @param 5 notNull
-- @null-groups none
-- @param-reject 3,4
INSERT INTO inspections
  (id, run_id, device_id, inspection_kind, status, scheduled_at)
VALUES (
  $1,
  $2,
  (SELECT d.id
   FROM devices d
   WHERE d.id = $3 OR d.serial_number = $4),
  'safety',
  'scheduled',
  $5
)
RETURNING
  id,           -- @notNull
  device_id,    -- @notNull
  inspected_at  -- @alwaysNull
