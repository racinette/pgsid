-- name: stock_regular
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 100, 40, 120, 9007199254740993);
-- name: stock_smallint_maximum
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 32767, 32767, 32768, 9223372036854775807);
-- name: stock_over_dispatch
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 10, 11, 12, 20);
-- name: stock_low_reserve
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 100, 40, 99, 100);
-- name: stock_low_available
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 32767, 0, 2147483647, 32766);
-- name: stock_smallint_minimum
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, -32768, -32768, 2147483647, 9223372036854775807);
-- name: stock_integer_minimum
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 0, 0, -2147483648, 9223372036854775807);
-- name: stock_bigint_minimum
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 0, 0, 0, -9223372036854775808);
-- name: stock_null_received
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, NULL, 0, 0, 0);
-- name: stock_null_related
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, 10, NULL, NULL, NULL);
-- name: stock_all_null
INSERT INTO stock_batches (id, received, dispatched, reserve, available) VALUES (2, NULL, NULL, NULL, NULL);

-- name: package_regular
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 4, 5, 20, 4, 5, -2);
-- name: package_excess_area
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 5, 5, 20, 4, 5, 0);
-- name: package_excess_slots
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 4, 5, 20, 3, 5, 0);
-- name: package_incomplete_batch
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 1, 1, 21, 5, 5, 0);
-- name: package_excess_adjustment
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 1, 1, 20, 4, 5, -21);
-- name: package_largest_square
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 46340, 46340, 2147483647, 2147483647, 1, 0);
-- name: package_square_overflow
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 46341, 46341, 2147483647, 2147483647, 1, 0);
-- name: package_signed_product
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, -4, -5, 20, 4, 5, 0);
-- name: package_truncated_negative_quotient
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, -7, 1, 7, -2, -3, 0);
-- name: package_negative_batch_size
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 2, 3, 6, -2, -3, 0);
-- name: package_minimum_product_overflow
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, -2147483648, -1, 0, 0, 1, 0);
-- name: package_zero_divisor
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 1, 1, 20, 4, 0, 0);
-- name: package_minimum_quotient
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, -2147483648, 1, -2147483648, 2147483647, -1, NULL);
-- name: package_abs_overflow
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, 1, 1, 20, 4, 5, -2147483648);
-- name: package_null_factors
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, NULL, NULL, 20, 4, 5, NULL);
-- name: package_all_null
INSERT INTO package_capacity (id, width, height, capacity, slots, batch_size, adjustment) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: allocation_regular
INSERT INTO warehouse_allocations (id, units, limit_count) VALUES (2, 10, 20);
-- name: allocation_maximum
INSERT INTO warehouse_allocations (id, units, limit_count) VALUES (2, 32767, 32767);
-- name: allocation_excess
INSERT INTO warehouse_allocations (id, units, limit_count) VALUES (2, 21, 20);
-- name: allocation_negative_limit
INSERT INTO warehouse_allocations (id, units, limit_count) VALUES (2, 0, -1);
-- name: allocation_null_units
INSERT INTO warehouse_allocations (id, units, limit_count) VALUES (2, NULL, 20);
-- name: allocation_null_limit
INSERT INTO warehouse_allocations (id, units, limit_count) VALUES (2, 10, NULL);

-- name: small_package_regular
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 4, 5, 20, 4, 5, -2, false);
-- name: small_package_excess_area
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 5, 5, 20, 4, 5, 0, false);
-- name: small_package_largest_square
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 181, 181, 32761, 32761, 1, 0, false);
-- name: small_package_square_overflow
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 182, 182, 32767, 32767, 1, 0, false);
-- name: small_package_signed_product
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, -4, -5, 20, 4, 5, 0, false);
-- name: small_package_minimum_times_negative_one
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, -32768, -1, 32767, 32767, 1, 0, false);
-- name: small_package_minimum_times_one
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, -32768, 1, 0, 0, 1, 0, false);
-- name: small_package_minimum_times_zero
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, -32768, 0, 0, 0, 1, 0, false);
-- name: small_package_excess_slots
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 3, 5, 0, false);
-- name: small_package_remainder
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 21, 5, 5, 0, false);
-- name: small_package_negative_divisor
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 2, 3, 6, -2, -3, 0, false);
-- name: small_package_negative_quotient_remainder
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, -7, 1, 7, -2, -3, 0, false);
-- name: small_package_skipped_zero_divisor
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 0, 0, 0, true);
-- name: small_package_minimum_quotient
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, -32768, 1, -32768, 32767, -1, NULL, false);
-- name: small_package_abs_overflow
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 4, 5, -32768, false);
-- name: small_package_excess_adjustment
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 4, 5, -21, false);
-- name: small_package_null_factors
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, NULL, NULL, 20, 4, 5, NULL, false);
-- name: small_package_null_dividend
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, NULL, 0, 0, 0, false);
-- name: small_package_null_divisor
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 0, NULL, 0, false);
-- name: small_package_all_null
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, false);

-- name: reconciliation_regular
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 100, 10, 40, 70);
-- name: reconciliation_wrong_balance
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 100, 10, 40, 71);
-- name: reconciliation_maximum
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 32767, 0, 0, 32767);
-- name: reconciliation_minimum
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -32768, 0, 0, -32768);
-- name: reconciliation_sum_overflow_before_subtraction
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 32767, 1, 1, 32767);
-- name: reconciliation_sum_underflow
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -32768, -1, 0, -32768);
-- name: reconciliation_subtraction_overflow
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 32767, 0, -1, 32767);
-- name: reconciliation_subtraction_underflow
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -32768, 0, 1, -32768);
-- name: reconciliation_null_received
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, NULL, 1, 0, 1);
-- name: reconciliation_null_available
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 10, 1, 0, NULL);
-- name: reconciliation_error_before_null_available
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 32767, 1, 0, NULL);
-- name: reconciliation_all_null
INSERT INTO stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, NULL, NULL, NULL, NULL);

-- name: correction_regular
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, -10, 10, 20);
-- name: correction_positive
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, 10, -10, 20);
-- name: correction_wrong_reversal
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, -10, -10, 20);
-- name: correction_exceeds_limit
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, -21, 21, 20);
-- name: correction_minimum_overflow
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, -32768, 32767, 32767);
-- name: correction_maximum
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, 32767, -32767, 32767);
-- name: correction_null_delta
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, NULL, 0, 20);
-- name: correction_null_reversal
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, -10, NULL, 20);
-- name: correction_all_null
INSERT INTO warehouse_corrections (id, delta, reversal, maximum) VALUES (2, NULL, NULL, NULL);

-- name: small_package_zero_divisor
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 0, 0, 0, false);
-- name: small_package_null_guard_zero_divisor
INSERT INTO small_package_capacity (id, width, height, capacity, slots, batch_size, adjustment, skip_batch_checks) VALUES (2, 1, 1, 20, 0, 0, 0, NULL);
