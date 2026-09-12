-- Request 500 has two eligible lots, while request 999 is absent. Lot 100 has
-- two approved adjustment candidates, one with a NULL note, so UPDATE FROM
-- cannot rely on a source-row-specific value. Reservation 1 is matched by the
-- reconciliation source, reservation 2 is source-absent, and reservation 3
-- exists only in the source.

INSERT INTO inventory_tenants
  (id, tenant_code, display_name, created_at, suspended_at, support_note)
VALUES
  (1, 'north', 'North Distribution', '2026-01-01 08:00+00', NULL, NULL),
  (2, 'south', 'South Distribution', '2026-01-02 08:00+00', NULL, 'regional stock'),
  (3, 'future', 'Future Distribution', '2026-01-03 08:00+00', NULL, NULL);

INSERT INTO warehouses
  (tenant_id, warehouse_id, warehouse_code, warehouse_name, region, opened_at,
   retired_at, manager_name)
VALUES
  (1, 10, 'N-PRIMARY', 'North Primary', 'north', '2026-01-10 08:00+00', NULL, 'Ada'),
  (1, 11, 'N-OLD', 'North Archive', 'north', '2025-01-10 08:00+00',
   '2026-07-01 08:00+00', NULL),
  (2, 10, 'S-PRIMARY', 'South Primary', 'south', '2026-02-10 08:00+00', NULL, NULL);

INSERT INTO inventory_items
  (tenant_id, item_id, sku, unit_name, category, description, retired_at, reorder_note)
VALUES
  (1, 20, 'BOLT-8', 'box', 'fastener', 'Eight millimetre bolts', NULL, 'reorder weekly'),
  (1, 21, 'SEAL-4', 'pack', 'seal', NULL, NULL, NULL),
  (2, 20, 'BOLT-8', 'box', 'fastener', NULL, NULL, NULL);

INSERT INTO stock_lots
  (tenant_id, lot_id, warehouse_id, item_id, lot_code, on_hand, reserved, state,
   expires_at, depleted_at, count_note, counted_by)
VALUES
  (1, 100, 10, 20, 'LOT-A', 20, 3, 'available', '2027-01-01 00:00+00', NULL, NULL, NULL),
  (1, 101, 10, 20, 'LOT-B', 12, 1, 'available', NULL, NULL, 'opening count', 'Ada'),
  (1, 102, 10, 21, 'LOT-C', 5, 5, 'depleted', NULL, '2026-08-01 09:00+00', NULL, NULL),
  (2, 100, 10, 20, 'LOT-A', 15, 0, 'available', NULL, NULL, NULL, NULL);

INSERT INTO allocation_requests
  (tenant_id, request_id, warehouse_id, item_id, requested_qty, priority, state,
   requested_at, needed_by, request_note)
VALUES
  (1, 500, 10, 20, 6, 1, 'open', '2026-09-01 08:00+00',
   '2026-09-10 08:00+00', 'two-lot allocation'),
  (1, 501, 10, 21, 2, 2, 'allocated', '2026-08-01 08:00+00', NULL, NULL),
  (1, 502, 10, 20, 5, 1, 'open', '2026-09-03 08:00+00',
   '2026-09-11 08:00+00', 'fresh allocation'),
  (2, 500, 10, 20, 4, 1, 'open', '2026-09-02 08:00+00', NULL, NULL);

INSERT INTO reservations
  (tenant_id, reservation_id, request_id, lot_id, reserved_qty, state,
   actor_label, reservation_note, released_at)
VALUES
  (1, 1, 500, 100, 2, 'pending', 'initial allocator', NULL, NULL),
  (1, 2, 500, 101, 1, 'pending', 'stale allocator', 'obsolete hold', NULL),
  (2, 1, 500, 100, 1, 'confirmed', 'south allocator', NULL, NULL);

INSERT INTO stock_adjustments
  (tenant_id, adjustment_id, lot_id, batch_code, quantity_delta, approved,
   actor_label, adjustment_note, proposed_expires_at, recorded_at)
VALUES
  (1, 700, 100, 'COUNT-A', 2, true, 'Mira', NULL, NULL, '2026-09-05 09:00+00'),
  (1, 701, 100, 'COUNT-A', 3, true, 'Niko', 'second counter',
   '2027-03-01 00:00+00', '2026-09-05 09:01+00'),
  (1, 702, 101, 'COUNT-A', 1, true, 'Mira', 'verified shelf', NULL,
   '2026-09-05 09:02+00'),
  (1, 703, 101, 'COUNT-B', -1, false, NULL, NULL, NULL, '2026-09-05 09:03+00');

INSERT INTO movement_events
  (tenant_id, event_id, lot_id, before_qty, after_qty, actor_label,
   previous_note, current_note, happened_at)
VALUES
  (1, 1, 101, 11, 12, 'Mira', NULL, 'opening count', '2026-08-20 10:00+00');
