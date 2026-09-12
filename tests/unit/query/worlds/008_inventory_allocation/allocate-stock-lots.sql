-- Two eligible lots make the reached control genuinely set-based. The same
-- jointly NULL actor binding succeeds for the absent request because no row
-- reaches the reservation constraints. INSERT has no old row, but its image
-- remains in the output shape under the renamed alias.
-- @args [1, 502, "allocation worker", "fallback worker"]
-- @args [1, 999, null, null]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param 4 nullable
-- @null-groups none
-- @param-reject 3,4
INSERT INTO reservations
  (tenant_id, reservation_id, request_id, lot_id, reserved_qty, state,
   actor_label, reservation_note)
SELECT
  r.tenant_id,
  900 + l.lot_id,
  r.request_id,
  l.lot_id,
  least(r.requested_qty, l.on_hand - l.reserved),
  'pending',
  a.actor_label,
  r.request_note
FROM allocation_requests AS r
JOIN inventory_tenants AS t ON t.id = r.tenant_id
JOIN warehouses AS w
  ON w.tenant_id = r.tenant_id AND w.warehouse_id = r.warehouse_id
JOIN inventory_items AS i
  ON i.tenant_id = r.tenant_id AND i.item_id = r.item_id
JOIN stock_lots AS l
  ON l.tenant_id = r.tenant_id
 AND l.warehouse_id = r.warehouse_id
 AND l.item_id = r.item_id
JOIN (VALUES
  (100, coalesce($3::text, $4::text)),
  (101, 'set-based control')
) AS a(lot_id, actor_label) ON a.lot_id = l.lot_id
WHERE r.tenant_id = $1
  AND r.request_id = $2
  AND r.state = 'open'
  AND t.suspended_at IS NULL
  AND w.retired_at IS NULL
  AND i.current_label IS NOT NULL
  AND l.state = 'available'
  AND l.on_hand > l.reserved
RETURNING WITH (OLD AS absent, NEW AS placed)
  absent.tenant_id,        -- @alwaysNull
  absent.reservation_id,   -- @alwaysNull
  placed.tenant_id,        -- @notNull
  placed.reservation_id,   -- @notNull
  placed.actor_label,      -- @notNull
  placed.reservation_note, -- @nullable
  placed.allocation_marker -- @notNull
