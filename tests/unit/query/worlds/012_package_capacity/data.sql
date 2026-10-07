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

INSERT INTO chosen_package_counts (id, small_units, integer_units, big_units, use_small, use_integer, recorded_pair, recorded_stock, recorded_baseline, recorded_double, recorded_ratio, recorded_nested, recorded_simple) VALUES (1, 7, 3, 5, true, false, 7, 7, 7, 14, 2, 3, 7);

INSERT INTO stock_count_comparisons (id, small_count, ordinary_count, bulk_count, small_baseline, ordinary_baseline, bulk_baseline, small_difference, recorded_order, largest_small, smallest_small, largest_ordinary, smallest_ordinary, largest_bulk, smallest_bulk)
VALUES (1, 7, 7, 7, 3, 3, 3, 4, 1, 7, 3, 7, 3, 7, 3);

INSERT INTO stock_integer_masks (id, small_bits, ordinary_bits, bulk_bits, small_mask, ordinary_mask, bulk_mask, shift_distance, small_intersection, ordinary_intersection, bulk_intersection, small_union, ordinary_union, bulk_union, small_difference, ordinary_difference, bulk_difference, small_complement, ordinary_complement, bulk_complement, small_shift_left, ordinary_shift_left, bulk_shift_left, small_shift_right, ordinary_shift_right, bulk_shift_right)
VALUES (1, 7, 7, 7, 3, 3, 3, 2, 3, 3, 3, 7, 7, 7, 4, 4, 4, -8, -8, -8, 28, 28, 28, 1, 1, 1);

INSERT INTO stock_count_math (id, ordinary_count, ordinary_batch, bulk_count, bulk_batch, ordinary_divisor, bulk_divisor, ordinary_multiple, bulk_multiple, ordinary_remainder, bulk_remainder, ordinary_next, bulk_next, bulk_previous, ordinary_absolute, ordinary_positive, ordinary_negative, skip_calculation)
VALUES (1, 18, 12, 18, 12, 6, 6, 36, 36, 6, 6, 19, 19, 17, 18, 18, -18, false);

INSERT INTO stock_window_bounds (id, small_count, ordinary_count, bulk_count, small_baseline, ordinary_baseline, bulk_baseline, small_offset, ordinary_offset, bulk_offset, subtract_offset, preceding, inside_window)
VALUES (1, 3, 3, 3, 5, 5, 5, 2, 2, 2, true, false, true);

INSERT INTO stock_boolean_records (id, selected, permitted, numeric_flag, recorded_flag, recorded_integer, recorded_both, recorded_either, recorded_order)
VALUES (1, true, false, 1, true, 1, false, true, 1);

INSERT INTO stock_radix_records (id, ordinary_count, bulk_count, ordinary_binary, ordinary_octal, ordinary_hex, bulk_binary, bulk_octal, bulk_hex, display_size, encoding_number, encoding_width, comparison_kind, comparison_strategy)
VALUES (1, 255, 255, '11111111', '377', 'ff', '11111111', '377', 'ff', '255 bytes', 6, 4, 3, 18);

INSERT INTO stock_hash_records (id, small_count, ordinary_count, bulk_count, selected, hash_seed, small_hash, ordinary_hash, bulk_hash, boolean_hash, small_seeded_hash, ordinary_seeded_hash, bulk_seeded_hash, boolean_seeded_hash)
VALUES (1, 1, 1, 1, true, 0, -1905060026, -1905060026, -1905060026, -1905060026, -3670598878359251130, -3670598878359251130, -3670598878359251130, -3670598878359251130);
