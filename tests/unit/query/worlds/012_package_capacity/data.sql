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

INSERT INTO bulk_package_products (id, units, packages, total, skip_product)
VALUES (1, 9007199254740993, 3, 27021597764222979, false);

INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder)
VALUES (1, 9007199254740993, 3, 3002399751580331, 0, false, false);

INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions)
VALUES (1, 9007199254740993, 3, 7, 27021597764222979, 63050394783186951, 3002399751580331, 0, 1286742750677284, 0, false, false);

INSERT INTO mixed_batch_remainders (id, small_units, integer_units, big_units, small_integer_loose, integer_small_loose, small_big_loose, big_small_loose, integer_big_loose, big_integer_loose, literal_small_loose, literal_big_loose, call_loose, skip_remainders)
VALUES (1, 7, 3, 5, 1, 3, 2, 5, 3, 2, 1, 2, 1, false);
