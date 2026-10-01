-- name: stock_with_available_units
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state)
VALUES (1, 10000, 10, 20, 'LOT-CHECK', 10, 3, 'available');
-- name: stock_with_negative_quantity
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state)
VALUES (1, 10000, 10, 20, 'LOT-CHECK', -1, 0, 'available');
-- name: stock_with_overreservation
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state)
VALUES (1, 10000, 10, 20, 'LOT-CHECK', 10, 11, 'available');
-- name: adjustment_without_required_actor
INSERT INTO stock_adjustments (tenant_id, adjustment_id, lot_id, batch_code, quantity_delta, approved, actor_label, recorded_at)
VALUES (1, 10000, 100, 'COUNT-CHECK', 1, true, NULL, '2026-08-02 10:00+00');
-- name: unapproved_adjustment_without_actor
INSERT INTO stock_adjustments (tenant_id, adjustment_id, lot_id, batch_code, quantity_delta, approved, actor_label, recorded_at)
VALUES (1, 10000, 100, 'COUNT-CHECK', -1, false, NULL, '2026-08-02 10:00+00');

-- name: lot_with_negative_reserved_quantity
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state) VALUES (1, 10000, 10, 20, 'LOT-CHECK', 10, -1, 'available');
-- name: lot_with_maximum_quantity
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state) VALUES (1, 10000, 10, 20, 'LOT-CHECK', 2147483647, 2147483646, 'available');
-- name: depleted_lot_with_zero_quantities
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state, depleted_at) VALUES (1, 10000, 10, 20, 'LOT-CHECK', 0, 0, 'depleted', '2026-08-02 10:00+00');
-- name: lot_count_note_without_counter
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state, count_note, counted_by) VALUES (1, 10000, 10, 20, 'LOT-CHECK', 10, 1, 'available', 'opening count', NULL);
-- name: lot_count_note_with_counter
INSERT INTO stock_lots (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state, count_note, counted_by) VALUES (1, 10000, 10, 20, 'LOT-CHECK', 10, 1, 'available', 'opening count', 'Daria');
-- name: allocation_with_quantity_and_priority
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at) VALUES (1, 10000, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00');
-- name: allocation_with_zero_quantity
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at) VALUES (1, 10000, 10, 20, 0, 1, 'open', '2026-08-02 10:00+00');
-- name: allocation_with_zero_priority
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at) VALUES (1, 10000, 10, 20, 1, 0, 'open', '2026-08-02 10:00+00');
-- name: zero_quantity_reservation
INSERT INTO reservations (tenant_id, reservation_id, request_id, lot_id, reserved_qty, state, actor_label) VALUES (1, 10000, 502, 100, 0, 'pending', 'Daria');
-- name: released_reservation_with_note
INSERT INTO reservations (tenant_id, reservation_id, request_id, lot_id, reserved_qty, state, actor_label, reservation_note, released_at) VALUES (1, 10000, 502, 100, 1, 'released', 'Daria', 'allocation cancelled', '2026-08-02 10:00+00');
-- name: movement_increases_quantity
INSERT INTO movement_events (tenant_id, event_id, lot_id, before_qty, after_qty, actor_label, current_note, happened_at) VALUES (1, 10000, 100, 10, 11, 'Daria', 'count revised', '2026-08-02 10:00+00');
-- name: movement_does_not_change_quantity
INSERT INTO movement_events (tenant_id, event_id, lot_id, before_qty, after_qty, actor_label, current_note, happened_at) VALUES (1, 10000, 100, 10, 10, 'Daria', 'count revised', '2026-08-02 10:00+00');
