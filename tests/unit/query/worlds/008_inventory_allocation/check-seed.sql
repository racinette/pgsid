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
-- name: request_note_describes_source
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at, request_note) VALUES (1, 10000, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00', 'count replenishment');
-- name: request_note_repeats_identity
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at, request_note) VALUES (1, 10000, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00', '10000');
-- name: request_note_distinguishes_minimum_identity
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at, request_note) VALUES (1, -2147483648, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00', '2147483648');
-- name: request_note_repeats_minimum_identity
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at, request_note) VALUES (1, -2147483648, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00', '-2147483648');
-- name: request_note_distinguishes_maximum_identity
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at, request_note) VALUES (1, 2147483647, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00', 'boundary request');
-- name: request_note_repeats_maximum_identity
INSERT INTO allocation_requests (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state, requested_at, request_note) VALUES (1, 2147483647, 10, 20, 1, 1, 'open', '2026-08-02 10:00+00', '2147483647');

-- name: inventory_tenant_with_identity
INSERT INTO inventory_tenants (id, tenant_code, display_name, created_at, suspended_at, support_note) VALUES (10000, 'check-depot', 'Check Depot', '2026-01-01 08:00+00', NULL, NULL);

-- name: inventory_tenant_suspended_at_creation
INSERT INTO inventory_tenants (id, tenant_code, display_name, created_at, suspended_at, support_note) VALUES (10000, 'check-depot', 'Check Depot', '2026-01-01 08:00+00', '2026-01-01 08:00+00', 'regional desk');

-- name: inventory_tenant_without_code
INSERT INTO inventory_tenants (id, tenant_code, display_name, created_at, suspended_at, support_note) VALUES (10000, '', 'Check Depot', '2026-01-01 08:00+00', NULL, NULL);

-- name: inventory_tenant_without_name
INSERT INTO inventory_tenants (id, tenant_code, display_name, created_at, suspended_at, support_note) VALUES (10000, 'check-depot', '', '2026-01-01 08:00+00', NULL, NULL);

-- name: inventory_tenant_note_repeats_code
INSERT INTO inventory_tenants (id, tenant_code, display_name, created_at, suspended_at, support_note) VALUES (10000, 'check-depot', 'Check Depot', '2026-01-01 08:00+00', NULL, 'check-depot');

-- name: inventory_tenant_suspended_before_creation
INSERT INTO inventory_tenants (id, tenant_code, display_name, created_at, suspended_at, support_note) VALUES (10000, 'check-depot', 'Check Depot', '2026-01-01 08:00+00', '2026-01-01 07:59:59.999999+00', NULL);

-- name: warehouse_open_without_manager
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', 'north', '2026-01-01 08:00+00', NULL, NULL);

-- name: warehouse_open_with_empty_manager
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', 'north', '2026-01-01 08:00+00', NULL, '');

-- name: warehouse_retired_at_opening_with_manager
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', 'north', '2026-01-01 08:00+00', '2026-01-01 08:00+00', 'Ada');

-- name: warehouse_retired_without_manager
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', 'north', '2026-01-01 08:00+00', '2026-01-01 08:00+00', NULL);

-- name: warehouse_without_code
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, '', 'Check Depot', 'north', '2026-01-01 08:00+00', NULL, NULL);

-- name: warehouse_without_name
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', '', 'north', '2026-01-01 08:00+00', NULL, NULL);

-- name: warehouse_without_region
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', '', '2026-01-01 08:00+00', NULL, NULL);

-- name: warehouse_retired_before_opening
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', 'north', '2026-01-01 08:00+00', '2026-01-01 07:59:59.999999+00', NULL);

-- name: warehouse_retired_with_empty_manager
INSERT INTO warehouses (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at, retired_at, manager_name) VALUES (1, 10000, 'CHECK-DEPOT', 'Check Depot', 'north', '2026-01-01 08:00+00', '2026-01-01 08:00+00', '');

-- name: item_with_identity_and_no_description
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', 'box', 'fastener', NULL, NULL, NULL);

-- name: item_open_with_description_and_reorder_note
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', 'box', 'fastener', 'sample fastener', NULL, 'order weekly');

-- name: item_retired_without_reorder_note
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', 'box', 'fastener', NULL, '2026-08-01 10:00+00', NULL);

-- name: item_without_sku
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, '', 'box', 'fastener', NULL, NULL, NULL);

-- name: item_without_unit
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', '', 'fastener', NULL, NULL, NULL);

-- name: item_without_category
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', 'box', '', NULL, NULL, NULL);

-- name: item_description_repeats_sku
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', 'box', 'fastener', 'CHECK-ITEM', NULL, NULL);

-- name: item_retired_with_reorder_note
INSERT INTO inventory_items (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note) VALUES (1, 10000, 'CHECK-ITEM', 'box', 'fastener', NULL, '2026-08-01 10:00+00', 'order weekly');
