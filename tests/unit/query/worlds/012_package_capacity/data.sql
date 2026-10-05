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
