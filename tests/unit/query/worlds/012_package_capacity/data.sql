INSERT INTO stock_batches (id, received, dispatched, reserve, available)
VALUES (1, 100, 40, 120, 9007199254740993);

INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment)
VALUES (1, 4, 5, 20, 4, 5, -2);

INSERT INTO warehouse_allocations (id, units, limit_count)
VALUES (1, 10, 20);

INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks)
VALUES (1, 4, 5, 20, 4, 5, -2, false);

INSERT INTO stock_reconciliations (id, received, returned, dispatched, available)
VALUES (1, 100, 10, 40, 70);

INSERT INTO warehouse_corrections (id, delta, reversal, maximum)
VALUES (1, -10, 10, 20);

INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual)
VALUES (1, 10, 5, 15, -2, 13, 5, 5);

INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size)
VALUES (1, 4, 5, 20, 4, 5);

INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum)
VALUES (1, 12, 3, 4, 36);

INSERT INTO warehouse_count_conversions (id, units, recorded, archived)
VALUES (1, 100, 100, 100);

INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion)
VALUES (1, -10, -10, false);

INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion)
VALUES (1, -10, -10, false);

INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion)
VALUES (1, -10, -10, false);

INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available)
VALUES (1, 9007199254740993, 2, 1, 9007199254740994);

INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude)
VALUES (1, -9007199254740993, 9007199254740993, 9007199254740993, -9007199254740993, false, false);

INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance)
VALUES (1, 9007199254740993, 1, 2, 9007199254740994, 9007199254740995, 9007199254740992, 9007199254740991, -9007199254740992, -9007199254740991);
