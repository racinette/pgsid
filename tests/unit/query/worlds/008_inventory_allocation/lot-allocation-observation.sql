-- A tenant can have no reservation, and a reservation can have no movement.
-- The nested optional units remain distinct even though both are keyed by the
-- same tenant and lot identities.
-- @params none
-- @null-group 1*,2
-- @null-group 3*,4*
-- @param-rejections none
SELECT
  t.tenant_code,         -- @notNull
  r.reservation_id,      -- @nullable
  r.allocation_marker,   -- @nullable
  m.event_id,            -- @nullable
  m.movement_class       -- @nullable
FROM inventory_tenants AS t
LEFT JOIN reservations AS r ON r.tenant_id = t.id
LEFT JOIN movement_events AS m
  ON m.tenant_id = r.tenant_id AND m.lot_id = r.lot_id
