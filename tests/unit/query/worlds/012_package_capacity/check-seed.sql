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

-- name: mixed_stock_regular
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 10, 5, 15, -2, 13, 5, 5);
-- name: mixed_stock_exceeds_smallint
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 32767, 1, 32768, -1, 32767, 32766, 1);
-- name: mixed_stock_wrong_total
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 10, 5, 16, -2, 14, 5, 6);
-- name: mixed_stock_wrong_adjustment
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 10, 5, 15, -2, 14, 5, 5);
-- name: mixed_stock_wrong_remaining
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 10, 5, 15, -2, 13, 6, 5);
-- name: mixed_stock_wrong_residual
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 10, 5, 15, -2, 13, 5, 6);
-- name: mixed_stock_integer_maximum
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 1, 2147483646, 2147483647, 0, 2147483647, -2147483645, 2147483646);
-- name: mixed_stock_addition_overflow
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 1, 2147483647, 2147483647, 0, 2147483647, -2147483646, 2147483646);
-- name: mixed_stock_adjustment_overflow
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 1, 2147483646, 2147483647, 1, 2147483647, -2147483645, 2147483646);
-- name: mixed_stock_adjustment_underflow
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 0, NULL, -2147483648, -1, -2147483648, NULL, -2147483648);
-- name: mixed_stock_remaining_overflow
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 1, -2147483647, -2147483646, 0, -2147483646, 2147483647, -2147483647);
-- name: mixed_stock_residual_underflow
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 1, NULL, -2147483648, 0, -2147483648, NULL, -2147483648);
-- name: mixed_stock_null_units
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, NULL, 5, 15, -2, 13, 5, 5);
-- name: mixed_stock_null_reserve
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 10, NULL, 15, -2, 13, NULL, 5);
-- name: mixed_stock_error_before_null_result
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, 1, 2147483647, NULL, 0, NULL, -2147483646, NULL);
-- name: mixed_stock_all_null
INSERT INTO mixed_stock_balances (id, units, reserve, total, adjustment, adjusted, remaining, residual) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: mixed_package_regular
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 4, 5, 20, 4, 5);
-- name: mixed_package_excess_area
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 5, 5, 20, 4, 5);
-- name: mixed_package_exceeds_smallint
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 32767, 2, 65534, 32767, 2);
-- name: mixed_package_minimum_product
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, -32768, 65536, -2147483648, -1073741824, 2);
-- name: mixed_package_product_underflow
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, -32768, 65537, -2147483648, -1073741824, 2);
-- name: mixed_package_positive_product_overflow
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 32767, 65539, 2147483647, 2147483647, 1);
-- name: mixed_package_excess_slots
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 4, 5, 20, 3, 5);
-- name: mixed_package_truncated_negative_quotient
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, -7, 1, 7, -2, -3);
-- name: mixed_package_quotient_overflow
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, -32768, 65536, -2147483648, 2147483647, -1);
-- name: mixed_package_skip_zero_divisor
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 4, 5, 20, 0, 0);
-- name: mixed_package_null_factors
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, NULL, NULL, 20, 4, 5);
-- name: mixed_package_null_divisor
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, 4, 5, 20, 0, NULL);
-- name: mixed_package_all_null
INSERT INTO mixed_package_capacity (id, width, height, capacity, slots, batch_size) VALUES (2, NULL, NULL, NULL, NULL, NULL);

-- name: bulk_package_regular
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, 12, 3, 4, 36);
-- name: bulk_package_excess_slots
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, 12, 3, 3, 36);
-- name: bulk_package_excess_capacity
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, 12, 3, 4, 35);
-- name: bulk_package_exceeds_smallint
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, -32768, -1, 32768, 32768);
-- name: bulk_package_signed_quotient
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, -7, 3, -2, -21);
-- name: bulk_package_zero_divisor
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, 1, 0, 1, 0);
-- name: bulk_package_null_with_zero_divisor
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, NULL, 0, 1, 0);
-- name: bulk_package_minimum_product
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, -32768, 65536, 0, -2147483648);
-- name: bulk_package_product_underflow
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, -32768, 65537, 0, -2147483648);
-- name: bulk_package_positive_product_overflow
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, 32767, 65539, 0, 2147483647);
-- name: bulk_package_null_divisor
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, 12, NULL, 4, 36);
-- name: bulk_package_all_null
INSERT INTO bulk_package_capacity (id, units, items_per_batch, slots, maximum) VALUES (2, NULL, NULL, NULL, NULL);

-- name: converted_count_regular
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, 100, 100, 100);
-- name: converted_count_minimum
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, -32768, -32768, -32768);
-- name: converted_count_maximum
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, 32767, 32767, 32767);
-- name: converted_count_wrong_recorded
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, 100, 101, 100);
-- name: converted_count_wrong_archived
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, 100, 100, 101);
-- name: converted_count_integer_minimum
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, NULL, -2147483648, -2147483648);
-- name: converted_count_integer_maximum
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, NULL, 2147483647, 2147483647);
-- name: converted_count_integer_mismatch
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, NULL, 2147483647, 2147483648);
-- name: converted_count_bigint_maximum
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, NULL, NULL, 9223372036854775807);
-- name: converted_count_null_recorded
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, 100, NULL, 100);
-- name: converted_count_null_archived
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, 100, 100, NULL);
-- name: converted_count_all_null
INSERT INTO warehouse_count_conversions (id, units, recorded, archived) VALUES (2, NULL, NULL, NULL);

-- name: compact_correction_regular
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, -10, -10, false);
-- name: compact_correction_minimum
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, -32768, -32768, false);
-- name: compact_correction_maximum
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 32767, 32767, false);
-- name: compact_correction_mismatch
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 10, 11, false);
-- name: compact_correction_overflow
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 32768, 32767, false);
-- name: compact_correction_underflow
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, -32769, -32768, false);
-- name: compact_correction_integer_maximum
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 2147483647, 0, false);
-- name: compact_correction_integer_minimum
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, -2147483648, 0, false);
-- name: compact_correction_error_before_null
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 32768, NULL, false);
-- name: compact_correction_skipped_overflow
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 32768, 0, true);
-- name: compact_correction_null_guard_overflow
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 32768, 0, NULL);
-- name: compact_correction_null_adjustment
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, NULL, 10, false);
-- name: compact_correction_null_compact
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, 10, NULL, false);
-- name: compact_correction_all_null
INSERT INTO compact_stock_corrections (id, adjustment, compact_adjustment, skip_conversion) VALUES (2, NULL, NULL, NULL);

-- name: bigint_integer_regular
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -10, -10, false);
-- name: bigint_integer_minimum
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -2147483648, -2147483648, false);
-- name: bigint_integer_maximum
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 2147483647, 2147483647, false);
-- name: bigint_integer_mismatch
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 10, 11, false);
-- name: bigint_integer_underflow
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -2147483649, -2147483648, false);
-- name: bigint_integer_overflow
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 2147483648, 2147483647, false);
-- name: bigint_integer_bigint_minimum
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -9223372036854775808, 0, false);
-- name: bigint_integer_bigint_maximum
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 9223372036854775807, 0, false);
-- name: bigint_integer_beyond_number_precision
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 9007199254740993, 1, false);
-- name: bigint_integer_below_number_precision
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -9007199254740993, -1, false);
-- name: bigint_integer_wrapped_zero
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 4294967296, 0, false);
-- name: bigint_integer_wrapped_negative
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 4294967295, -1, false);
-- name: bigint_integer_error_before_null
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 2147483648, NULL, false);
-- name: bigint_integer_skipped_minimum
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -9223372036854775808, 0, true);
-- name: bigint_integer_skipped_maximum
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 9223372036854775807, 0, true);
-- name: bigint_integer_null_guard_overflow
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 2147483648, 0, NULL);
-- name: bigint_integer_null_adjustment
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, NULL, 10, false);
-- name: bigint_integer_null_recorded
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 10, NULL, false);
-- name: bigint_integer_all_null
INSERT INTO compact_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, NULL, NULL, NULL);

-- name: bigint_smallint_regular
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -10, -10, false);
-- name: bigint_smallint_minimum
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -32768, -32768, false);
-- name: bigint_smallint_maximum
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 32767, 32767, false);
-- name: bigint_smallint_mismatch
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 10, 11, false);
-- name: bigint_smallint_underflow
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -32769, -32768, false);
-- name: bigint_smallint_overflow
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 32768, 32767, false);
-- name: bigint_smallint_bigint_minimum
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -9223372036854775808, 0, false);
-- name: bigint_smallint_bigint_maximum
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 9223372036854775807, 0, false);
-- name: bigint_smallint_beyond_number_precision
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 9007199254740993, 1, false);
-- name: bigint_smallint_below_number_precision
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -9007199254740993, -1, false);
-- name: bigint_smallint_wrapped_zero
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 4294967296, 0, false);
-- name: bigint_smallint_wrapped_negative
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 4294967295, -1, false);
-- name: bigint_smallint_error_before_null
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 32768, NULL, false);
-- name: bigint_smallint_skipped_minimum
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, -9223372036854775808, 0, true);
-- name: bigint_smallint_skipped_maximum
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 9223372036854775807, 0, true);
-- name: bigint_smallint_null_guard_overflow
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 32768, 0, NULL);
-- name: bigint_smallint_null_adjustment
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, NULL, 10, false);
-- name: bigint_smallint_null_recorded
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, 10, NULL, false);
-- name: bigint_smallint_all_null
INSERT INTO tiny_inventory_adjustments (id, adjustment, recorded, skip_conversion) VALUES (2, NULL, NULL, NULL);

-- name: bulk_stock_exact
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9007199254740993, 2, 1, 9007199254740994);
-- name: bulk_stock_mismatch
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9007199254740993, 2, 1, 9007199254740993);
-- name: bulk_stock_maximum
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9223372036854775807, 0, 0, 9223372036854775807);
-- name: bulk_stock_minimum
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808);
-- name: bulk_stock_addition_overflow
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9223372036854775807, 1, 0, 9223372036854775807);
-- name: bulk_stock_addition_underflow
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -9223372036854775808, -1, 0, -9223372036854775808);
-- name: bulk_stock_subtraction_overflow
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9223372036854775807, 0, -1, 9223372036854775807);
-- name: bulk_stock_subtraction_underflow
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -9223372036854775808, 0, 1, -9223372036854775808);
-- name: bulk_stock_intermediate_overflow
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9223372036854775807, 1, 1, 9223372036854775807);
-- name: bulk_stock_error_before_null
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9223372036854775807, 1, 0, NULL);
-- name: bulk_stock_cancel_minimum
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, -9223372036854775808, 9223372036854775807, 0, -1);
-- name: bulk_stock_cancel_maximum
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 9223372036854775807, -9223372036854775808, 0, -1);
-- name: bulk_stock_null_received
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, NULL, 0, 0, 0);
-- name: bulk_stock_null_returned
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 10, NULL, 1, 9);
-- name: bulk_stock_null_dispatched
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 10, 0, NULL, 10);
-- name: bulk_stock_null_result
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, 10, 0, 1, NULL);
-- name: bulk_stock_all_null
INSERT INTO bulk_stock_reconciliations (id, received, returned, dispatched, available) VALUES (2, NULL, NULL, NULL, NULL);

-- name: bulk_correction_exact
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9007199254740993, 9007199254740993, 9007199254740993, -9007199254740993, false, false);
-- name: bulk_correction_wrong_reversal
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -10, -10, 10, -10, false, false);
-- name: bulk_correction_wrong_magnitude
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -10, 10, 9, -10, false, false);
-- name: bulk_correction_wrong_confirmed
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -10, 10, 10, 10, false, false);
-- name: bulk_correction_maximum
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, 9223372036854775807, -9223372036854775807, 9223372036854775807, 9223372036854775807, false, false);
-- name: bulk_correction_negative_maximum
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775807, 9223372036854775807, 9223372036854775807, -9223372036854775807, false, false);
-- name: bulk_correction_minimum_errors
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808, false, false);
-- name: bulk_correction_minimum_negation
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808, false, true);
-- name: bulk_correction_minimum_absolute
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808, true, false);
-- name: bulk_correction_skipped_minimum
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808, true, true);
-- name: bulk_correction_null_guards
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808, NULL, NULL);
-- name: bulk_correction_zero
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, 0, 0, 0, 0, false, false);
-- name: bulk_correction_null_delta
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, NULL, 10, 10, 10, false, false);
-- name: bulk_correction_null_results
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -10, NULL, NULL, NULL, false, false);
-- name: bulk_correction_error_before_null
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, -9223372036854775808, NULL, NULL, -9223372036854775808, false, false);
-- name: bulk_correction_all_null
INSERT INTO bulk_warehouse_corrections (id, delta, reversal, magnitude, confirmed, skip_reversal, skip_magnitude) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: mixed_bulk_exact
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9007199254740993, 1, 2, 9007199254740994, 9007199254740995, 9007199254740992, 9007199254740991, -9007199254740992, -9007199254740991);
-- name: mixed_bulk_negative_exact
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9007199254740993, -1, -2, -9007199254740994, -9007199254740995, -9007199254740992, -9007199254740991, 9007199254740992, 9007199254740991);
-- name: mixed_bulk_small_maximum
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 0, 32767, 0, 32767, 0, -32767, 0, 32767, 0);
-- name: mixed_bulk_small_minimum
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 0, -32768, 0, -32768, 0, 32768, 0, -32768, 0);
-- name: mixed_bulk_integer_maximum
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 0, 0, 2147483647, 0, 2147483647, 0, -2147483647, 0, 2147483647);
-- name: mixed_bulk_integer_minimum
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 0, 0, -2147483648, 0, -2147483648, 0, 2147483648, 0, -2147483648);
-- name: mixed_bulk_wrong_small_total
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, 2, 12, 12, 9, 8, -9, -8);
-- name: mixed_bulk_wrong_integer_total
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, 2, 11, 13, 9, 8, -9, -8);
-- name: mixed_bulk_wrong_small_residual
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, 2, 11, 12, 10, 8, -9, -8);
-- name: mixed_bulk_wrong_integer_residual
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, 2, 11, 12, 9, 9, -9, -8);
-- name: mixed_bulk_wrong_small_balance
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, 2, 11, 12, 9, 8, -8, -8);
-- name: mixed_bulk_wrong_integer_balance
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, 2, 11, 12, 9, 8, -9, -7);
-- name: mixed_bulk_maximum
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9223372036854775807, 0, 0, 9223372036854775807, 9223372036854775807, 9223372036854775807, 9223372036854775807, -9223372036854775807, -9223372036854775807);
-- name: mixed_bulk_minimum
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, 0, 0, -9223372036854775808, -9223372036854775808, -9223372036854775808, -9223372036854775808, 9223372036854775807, 9223372036854775807);
-- name: mixed_bulk_small_add_overflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9223372036854775807, 1, 0, 9223372036854775807, 9223372036854775807, 9223372036854775806, 9223372036854775807, -9223372036854775806, -9223372036854775807);
-- name: mixed_bulk_small_add_underflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, -1, 0, -9223372036854775808, -9223372036854775808, -9223372036854775807, -9223372036854775808, 9223372036854775807, 9223372036854775807);
-- name: mixed_bulk_integer_add_overflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9223372036854775807, 0, 1, 9223372036854775807, 9223372036854775807, 9223372036854775807, 9223372036854775806, -9223372036854775807, -9223372036854775806);
-- name: mixed_bulk_integer_add_underflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, 0, -1, -9223372036854775808, -9223372036854775808, -9223372036854775808, -9223372036854775807, 9223372036854775807, 9223372036854775807);
-- name: mixed_bulk_small_subtract_overflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9223372036854775807, -1, 0, 9223372036854775806, 9223372036854775807, 9223372036854775807, 9223372036854775807, -9223372036854775808, -9223372036854775807);
-- name: mixed_bulk_small_subtract_underflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, 1, 0, -9223372036854775807, -9223372036854775808, -9223372036854775808, -9223372036854775808, 9223372036854775807, 9223372036854775807);
-- name: mixed_bulk_integer_subtract_overflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9223372036854775807, 0, -1, 9223372036854775807, 9223372036854775806, 9223372036854775807, 9223372036854775807, -9223372036854775807, -9223372036854775808);
-- name: mixed_bulk_integer_subtract_underflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, 0, 1, -9223372036854775808, -9223372036854775807, -9223372036854775808, -9223372036854775808, 9223372036854775807, 9223372036854775807);
-- name: mixed_bulk_small_reverse_overflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, 0, NULL, -9223372036854775808, NULL, -9223372036854775808, NULL, 9223372036854775807, NULL);
-- name: mixed_bulk_integer_reverse_overflow
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, -9223372036854775808, NULL, 0, NULL, -9223372036854775808, NULL, -9223372036854775808, NULL, 9223372036854775807);
-- name: mixed_bulk_error_before_null
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 9223372036854775807, 1, 0, NULL, 9223372036854775807, 9223372036854775806, 9223372036854775807, -9223372036854775806, -9223372036854775807);
-- name: mixed_bulk_null_delta
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, NULL, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: mixed_bulk_null_small
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, NULL, 2, NULL, 12, NULL, 8, NULL, -8);
-- name: mixed_bulk_null_integer
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, 10, 1, NULL, 11, NULL, 9, NULL, -9, NULL);
-- name: mixed_bulk_all_null
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: mixed_bulk_minimum_representable
INSERT INTO mixed_bulk_adjustments (id, delta, small_adjustment, integer_adjustment, small_total, integer_total, small_residual, integer_residual, small_balance, integer_balance)
VALUES (2, -9223372036854775807, 0, 0, -9223372036854775807, -9223372036854775807, -9223372036854775807, -9223372036854775807, 9223372036854775807, 9223372036854775807);

-- name: bulk_product_exact
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9007199254740993, 3, 27021597764222979, false);

-- name: bulk_product_negative
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -9007199254740993, 3, -27021597764222979, false);

-- name: bulk_product_negative_multiplier
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9007199254740993, -3, -27021597764222979, false);

-- name: bulk_product_both_negative
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -7, -3, 21, false);

-- name: bulk_product_maximum
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9223372036854775807, 1, 9223372036854775807, false);

-- name: bulk_product_minimum
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -9223372036854775808, 1, -9223372036854775808, false);

-- name: bulk_product_zero
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -9223372036854775808, 0, 0, false);

-- name: bulk_product_zero_left
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 0, -9223372036854775808, 0, false);

-- name: bulk_product_square
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 3037000499, 3037000499, 9223372030926249001, false);

-- name: bulk_product_square_overflow
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 3037000500, 3037000500, 9223372036854775807, false);

-- name: bulk_product_negative_square
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -3037000499, 3037000499, -9223372030926249001, false);

-- name: bulk_product_negative_square_overflow
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -3037000500, 3037000500, -9223372036854775808, false);

-- name: bulk_product_upper_overflow
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9223372036854775807, 2, 9223372036854775807, false);

-- name: bulk_product_lower_overflow
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -9223372036854775808, 2, -9223372036854775808, false);

-- name: bulk_product_minimum_negation
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -9223372036854775808, -1, 9223372036854775807, false);

-- name: bulk_product_minimum_multiplier
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -1, -9223372036854775808, 9223372036854775807, false);

-- name: bulk_product_all_minimum
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, -9223372036854775808, -9223372036854775808, 9223372036854775807, false);

-- name: bulk_product_null_units
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, NULL, 2, NULL, false);

-- name: bulk_product_null_packages
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 2, NULL, NULL, false);

-- name: bulk_product_all_null
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, NULL, NULL, NULL, false);

-- name: bulk_product_wrong_total
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 7, 3, 20, false);

-- name: bulk_product_null_total
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 7, 3, NULL, false);

-- name: bulk_product_error_before_null
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9223372036854775807, 2, NULL, false);

-- name: bulk_product_guarded_overflow
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9223372036854775807, 2, 9223372036854775807, true);

-- name: bulk_product_null_guard
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 7, 3, 21, NULL);

-- name: bulk_product_null_guard_overflow
INSERT INTO bulk_package_products (id, units, packages, total, skip_product) VALUES (2, 9223372036854775807, 2, 9223372036854775807, NULL);

-- name: bulk_division_exact
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 9007199254740993, 3, 3002399751580331, 0, false, false);

-- name: bulk_division_remainder
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 9007199254740993, 7, 1286742750677284, 5, false, false);

-- name: bulk_division_negative
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -7, 3, -2, -1, false, false);

-- name: bulk_division_negative_divisor
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, -3, -2, 1, false, false);

-- name: bulk_division_both_negative
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -7, -3, 2, -1, false, false);

-- name: bulk_division_zero_quotient
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -1, 3, 0, -1, false, false);

-- name: bulk_division_maximum
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 9223372036854775807, 1, 9223372036854775807, 0, false, false);

-- name: bulk_division_minimum
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -9223372036854775808, 1, -9223372036854775808, 0, false, false);

-- name: bulk_division_minimum_remainder
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -9223372036854775808, 3, -3074457345618258602, -2, false, false);

-- name: bulk_division_minimum_divisor
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, -9223372036854775808, 0, 7, false, false);

-- name: bulk_division_all_minimum
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -9223372036854775808, -9223372036854775808, 1, 0, false, false);

-- name: bulk_division_zero_units
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 0, 3, 0, 0, false, false);

-- name: bulk_division_zero_divisor
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 0, 0, 0, false, false);

-- name: bulk_division_zero_both
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 0, 0, 0, 0, false, false);

-- name: bulk_division_minimum_overflow
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -9223372036854775808, -1, 9223372036854775807, 0, false, false);

-- name: bulk_division_null_units
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, NULL, 0, NULL, NULL, false, false);

-- name: bulk_division_null_divisor
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, NULL, NULL, NULL, false, false);

-- name: bulk_division_all_null
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, NULL, NULL, NULL, NULL, false, false);

-- name: bulk_division_wrong_quotient
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 3, 3, 1, false, false);

-- name: bulk_division_wrong_remainder
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 3, 2, 0, false, false);

-- name: bulk_division_null_results
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 3, NULL, NULL, false, false);

-- name: bulk_division_error_before_null
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 0, NULL, NULL, false, false);

-- name: bulk_division_minimum_modulus_minus_one
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -9223372036854775808, -1, 9223372036854775807, 0, true, false);

-- name: bulk_division_minimum_skip_remainder
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -9223372036854775808, -1, 9223372036854775807, 0, false, true);

-- name: bulk_division_guard_division_only
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 0, 0, 0, true, false);

-- name: bulk_division_guard_remainder_only
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 0, 0, 0, false, true);

-- name: bulk_division_guard_both
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, 7, 0, 0, 0, true, true);

-- name: bulk_division_null_guards
INSERT INTO bulk_package_divisions (id, units, batch_size, batches, loose_units, skip_division, skip_remainder) VALUES (2, -7, 3, -2, -1, NULL, NULL);

-- name: mixed_bulk_package_exact
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9007199254740993, 3, 7, 27021597764222979, 63050394783186951, 3002399751580331, 0, 1286742750677284, 0, false, false);

-- name: mixed_bulk_package_negative
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9007199254740993, 3, 7, -27021597764222979, -63050394783186951, -3002399751580331, 0, -1286742750677284, 0, false, false);

-- name: mixed_bulk_package_negative_batches
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9007199254740993, -3, -7, -27021597764222979, -63050394783186951, -3002399751580331, 0, -1286742750677284, 0, false, false);

-- name: mixed_bulk_package_both_negative
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -7, -3, -5, 21, 35, 2, 0, 1, 0, false, false);

-- name: mixed_bulk_package_small_limits
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, -32768, 32767, -229376, 229369, 0, -4681, 0, 4681, false, false);

-- name: mixed_bulk_package_integer_limits
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 32767, -2147483648, 229369, -15032385536, 0, 4681, 0, -306783378, false, false);

-- name: mixed_bulk_package_integer_maximum
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 2147483647, 21, 15032385529, 2, 0, 0, 306783378, false, false);

-- name: mixed_bulk_package_maximum
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9223372036854775807, 1, 1, 9223372036854775807, 9223372036854775807, 9223372036854775807, 0, 9223372036854775807, 0, false, false);

-- name: mixed_bulk_package_minimum
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9223372036854775808, 1, 1, -9223372036854775808, -9223372036854775808, -9223372036854775808, 0, -9223372036854775808, 0, false, false);

-- name: mixed_bulk_package_minimum_small_overflow
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9223372036854775808, -1, 1, 9223372036854775807, -9223372036854775808, 9223372036854775807, 0, -9223372036854775808, 0, false, false);

-- name: mixed_bulk_package_minimum_integer_overflow
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9223372036854775808, 1, -1, -9223372036854775808, 9223372036854775807, -9223372036854775808, 0, 9223372036854775807, 0, false, false);

-- name: mixed_bulk_package_small_product_overflow
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9223372036854775807, 2, 1, 9223372036854775807, 9223372036854775807, 4611686018427387903, 0, 9223372036854775807, 0, false, false);

-- name: mixed_bulk_package_integer_product_overflow
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9223372036854775807, 1, 2, 9223372036854775807, 9223372036854775807, 9223372036854775807, 0, 4611686018427387903, 0, false, false);

-- name: mixed_bulk_package_negative_product_overflow
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9223372036854775808, 2, 1, -9223372036854775808, -9223372036854775808, -4611686018427387904, 0, -9223372036854775808, 0, false, false);

-- name: mixed_bulk_package_zero_small_divisor
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 0, 3, 0, 21, 0, 0, 2, 0, false, false);

-- name: mixed_bulk_package_zero_integer_divisor
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 0, 21, 0, 2, 0, 0, 0, false, false);

-- name: mixed_bulk_package_zero_bulk_divisor
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 0, 3, 7, 0, 0, 0, 0, 0, 0, false, false);

-- name: mixed_bulk_package_all_zero
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, false);

-- name: mixed_bulk_package_null_units
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, false, false);

-- name: mixed_bulk_package_null_small
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, NULL, 3, NULL, 21, NULL, NULL, 2, 0, false, false);

-- name: mixed_bulk_package_null_integer
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, NULL, 21, NULL, 2, 0, NULL, NULL, false, false);

-- name: mixed_bulk_package_all_null
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);

-- name: mixed_bulk_package_wrong_small_total
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 100, 35, 2, 0, 1, 0, false, false);

-- name: mixed_bulk_package_wrong_integer_total
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 21, 100, 2, 0, 1, 0, false, false);

-- name: mixed_bulk_package_wrong_bulk_small_batches
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 21, 35, 100, 0, 1, 0, false, false);

-- name: mixed_bulk_package_wrong_small_bulk_batches
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 21, 35, 2, 100, 1, 0, false, false);

-- name: mixed_bulk_package_wrong_bulk_integer_batches
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 21, 35, 2, 0, 100, 0, false, false);

-- name: mixed_bulk_package_wrong_integer_bulk_batches
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 21, 35, 2, 0, 1, 100, false, false);

-- name: mixed_bulk_package_null_results
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, NULL, NULL, NULL, NULL, NULL, NULL, false, false);

-- name: mixed_bulk_package_error_before_null
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9223372036854775807, 2, 3, NULL, NULL, 4611686018427387903, 0, 3074457345618258602, 0, false, false);

-- name: mixed_bulk_package_guarded_products
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 9223372036854775807, 2, 3, 9223372036854775807, 9223372036854775807, 4611686018427387903, 0, 3074457345618258602, 0, true, false);

-- name: mixed_bulk_package_guarded_divisions
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 0, 3, 7, 0, 0, 0, 0, 0, 0, false, true);

-- name: mixed_bulk_package_guarded_both
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9223372036854775808, -1, -1, 9223372036854775807, 9223372036854775807, 9223372036854775807, 0, 9223372036854775807, 0, true, true);

-- name: mixed_bulk_package_minimum_division_only
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, -9223372036854775808, -1, -1, 9223372036854775807, 9223372036854775807, 9223372036854775807, 0, 9223372036854775807, 0, true, false);

-- name: mixed_bulk_package_null_guards
INSERT INTO mixed_bulk_packages (id, units, small_batch, integer_batch, small_total, integer_total, bulk_small_batches, small_bulk_batches, bulk_integer_batches, integer_bulk_batches, skip_products, skip_divisions) VALUES (2, 7, 3, 5, 21, 35, 2, 0, 1, 0, NULL, NULL);
