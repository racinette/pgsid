-- name: replenishment_primary
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 7, 3, 5, 7, 7, 14, 5);

-- name: replenishment_warehouse
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, NULL, 3, 5, 3, 0, 5, 5);

-- name: replenishment_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, NULL, NULL, 9007199254740993, 9007199254740993, 0, 9007199254740993, 9007199254740993);

-- name: replenishment_negative_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, NULL, NULL, -9007199254740993, -9007199254740993, 0, -9007199254740993, -9007199254740993);

-- name: replenishment_minimum_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, NULL, NULL, -9223372036854775808, -9223372036854775808, 0, -9223372036854775808, -9223372036854775808);

-- name: replenishment_maximum_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, NULL, NULL, 9223372036854775807, 9223372036854775807, 0, 9223372036854775807, 9223372036854775807);

-- name: replenishment_literal
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, NULL, NULL, NULL, 0, 0, 0, 0);

-- name: replenishment_division
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 2, 7, NULL, 2, 2, 4, 3);

-- name: replenishment_skipped_division
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 0, 7, 5, 0, 0, 0, 5);

-- name: replenishment_zero_division
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 0, 7, NULL, 0, 0, 0, 0);

-- name: replenishment_integer_division_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, -1, -2147483648, NULL, -1, -1, -2, 2147483648);

-- name: replenishment_small_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 32767, 3, 5, 32767, 32767, 65534, 5);

-- name: replenishment_small_negative_overflow
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, -32768, 3, 5, -32768, -32768, -65536, 5);

-- name: replenishment_wrong_recorded_units
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 7, 3, 5, 100, 7, 14, 5);

-- name: replenishment_wrong_recorded_baseline
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 7, 3, 5, 7, 100, 14, 5);

-- name: replenishment_wrong_recorded_double
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 7, 3, 5, 7, 7, 100, 5);

-- name: replenishment_wrong_recorded_ratio
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 7, 3, 5, 7, 7, 14, 100);

-- name: replenishment_null_results
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 7, 3, 5, NULL, NULL, NULL, NULL);

-- name: replenishment_error_before_null
INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (2, 32767, 3, 5, NULL, NULL, NULL, NULL);

-- name: delivery_defaults_primary
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, true);

-- name: delivery_defaults_backup
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, NULL, '2026-10-02', '2026-10-02', NULL, '2026-10-02 11:22:33', '2026-10-02 11:22:33', NULL, '2026-10-02 11:22:33-04', '2026-10-02 11:22:33-04', NULL, false, false);

-- name: delivery_defaults_literal
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, NULL, NULL, '2000-01-01', NULL, NULL, '2000-01-01 00:00:00', NULL, NULL, '2000-01-01 00:00:00+00', NULL, NULL, false);

-- name: delivery_defaults_wrong_recorded_day
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', '2000-01-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, true);

-- name: delivery_defaults_wrong_recorded_schedule
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2000-01-01', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, true);

-- name: delivery_defaults_wrong_recorded_confirmation
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2000-01-01 00:00:00+00', true, false, true);

-- name: delivery_defaults_wrong_recorded_enabled
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, false);

-- name: delivery_defaults_null_results
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', NULL, '2026-10-01 10:20:30', '2026-10-02 11:22:33', NULL, '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', NULL, true, false, NULL);

-- name: shipment_labels_primary
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, 'first', 'second', 'first', 'A', 'B', 'A', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'dispatched');

-- name: shipment_labels_backup
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, NULL, 'second', 'second', NULL, 'B', 'B', NULL, '4.5600', '4.5600', NULL, 'held', 'held');

-- name: shipment_labels_literal
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, NULL, NULL, 'parcel', NULL, NULL, 'P', NULL, NULL, 0, NULL, NULL, 'ready');

-- name: shipment_labels_wrong_recorded_label
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, 'first', 'second', 'wrong', 'A', 'B', 'A', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'dispatched');

-- name: shipment_labels_wrong_recorded_code
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, 'first', 'second', 'first', 'A', 'B', 'wrong', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'dispatched');

-- name: shipment_labels_wrong_recorded_fee
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, 'first', 'second', 'first', 'A', 'B', 'A', '1.2300', '4.5600', 100, 'dispatched', 'held', 'dispatched');

-- name: shipment_labels_wrong_recorded_stage
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, 'first', 'second', 'first', 'A', 'B', 'A', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'ready');

-- name: shipment_labels_null_results
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, 'first', 'second', NULL, 'A', 'B', NULL, '1.2300', '4.5600', NULL, 'dispatched', 'held', NULL);

-- name: delivery_false_is_present
INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (2, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', false, true, false);

-- name: labels_empty_and_nan_are_present
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, '', 'second', '', 'A', 'B', 'A', 'NaN', '4.5600', 'NaN', 'dispatched', 'held', 'dispatched');

-- name: labels_negative_infinity
INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (2, NULL, 'second', 'second', NULL, 'B', 'B', NULL, '-Infinity', '-Infinity', NULL, 'held', 'held');

-- name: shipment_fee_sign_finite
INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (10, false, -12.3400, 8.5, -1, 8.5, -12.34, 12.34, 12.34, -12.34, -1);

-- name: shipment_fee_sign_wrong_records
INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (11, false, -12.3400, 8.5, 0, 0, 0, 0, 0, 0, 0);

-- name: shipment_fee_sign_null
INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (12, false, NULL, NULL, 0, 0, 0, 0, 0, 0, 0);

-- name: shipment_fee_sign_negative_zero
INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (13, false, -0.0000, 0.00, 0, 0, 0, 0, 0, 0, 0);

-- name: shipment_fee_sign_infinity
INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (14, false, '-Infinity', 'Infinity', -1, 'Infinity', '-Infinity', 'Infinity', 'Infinity', '-Infinity', -1);

-- name: shipment_fee_sign_nan
INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (15, false, 'NaN', 'Infinity', 1, 'NaN', 'Infinity', 'NaN', 'NaN', 'NaN', 'NaN');

-- name: shipment_fee_scale_finite
INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (10, false, -12.3400, 4, 2, -12.34);

-- name: shipment_fee_scale_wrong_records
INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (11, false, -12.3400, 0, 0, 0);

-- name: shipment_fee_scale_null
INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (12, false, NULL, 0, 0, 0);

-- name: shipment_fee_scale_zero
INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (13, false, 0.0000, 4, 0, 0);

-- name: shipment_fee_scale_nan
INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (14, false, 'NaN', 0, 0, 'NaN');

-- name: shipment_fee_scale_infinity
INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (15, false, 'Infinity', 0, 0, 'Infinity');

-- name: shipment_fee_whole_negative
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (10, false, -12.34, -12, -13);

-- name: shipment_fee_whole_wrong_records
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (11, false, -12.34, 0, 0);

-- name: shipment_fee_whole_null
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (12, false, NULL, 0, 0);

-- name: shipment_fee_whole_positive
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (13, false, 12.34, 13, 12);

-- name: shipment_fee_whole_integer
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (14, false, 12.0000, 12, 12);

-- name: shipment_fee_whole_tiny_negative
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (15, false, -0.0001, 0, -1);

-- name: shipment_fee_whole_nan
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (16, false, 'NaN', 'NaN', 'NaN');

-- name: shipment_fee_whole_negative_infinity
INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (17, false, '-Infinity', '-Infinity', '-Infinity');

-- name: shipment_fee_precision_negative_half
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (10, false, -12.3450, 2, -12.35, -12, -12.34, -12);

-- name: shipment_fee_precision_wrong_records
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (11, false, -12.3450, 2, 0, 0, 0, 0);

-- name: shipment_fee_precision_null
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (12, false, NULL, 2, 0, 0, 0, 0);

-- name: shipment_fee_precision_positive_half
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (13, false, 12.3450, 2, 12.35, 12, 12.34, 12);

-- name: shipment_fee_precision_negative_places
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (14, false, 150.5000, -2, 200, 151, 100, 150);

-- name: shipment_fee_precision_negative_half_integer
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (15, false, -150.5000, -2, -200, -151, -100, -150);

-- name: shipment_fee_precision_digit_carry
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (16, false, 999.995, 2, 1000, 1000, 999.99, 999);

-- name: shipment_fee_precision_nan
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (17, false, 'NaN', -2147483648, 'NaN', 'NaN', 'NaN', 'NaN');

-- name: shipment_fee_precision_infinity
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (18, false, 'Infinity', 2147483647, 'Infinity', 'Infinity', 'Infinity', 'Infinity');

-- name: shipment_fee_precision_null_places
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (19, false, 12.3450, NULL, 0, 12, 0, 12);

-- name: shipment_fee_precision_skipped
INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (20, true, 12.3450, -2147483648, 0, 0, 0, 0);

-- name: fee_small_units_positive_half
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (10, false, '1.5', 2, 2);

-- name: fee_small_units_negative_half
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (11, false, '-1.5', -2, -2);

-- name: fee_small_units_trailing_zero
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (12, false, '130.000', 130, 130);

-- name: fee_small_units_exponent
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (13, false, '1e3', 1000, 1000);

-- name: fee_small_units_wrong_rounded
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (14, false, '1.5', 1, 1);

-- name: fee_small_units_wrong_numeric
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (15, false, '1.5', 2, 3);

-- name: fee_small_units_null
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (16, false, NULL, NULL, NULL);

-- name: fee_small_units_maximum
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (17, false, '32767.49', '32767', '32767');

-- name: fee_small_units_minimum
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (18, false, '-32768.49', '-32768', '-32768');

-- name: fee_small_units_maximum_overflow
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (19, false, '32767.5', 0, 0);

-- name: fee_small_units_minimum_overflow
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (20, false, '-32768.5', 0, 0);

-- name: fee_small_units_nan
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (21, false, 'NaN', 0, 0);

-- name: fee_small_units_infinity
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (22, false, 'Infinity', 0, 0);

-- name: fee_small_units_negative_infinity
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (23, false, '-Infinity', 0, 0);

-- name: fee_small_units_skipped_nan
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (24, true, 'NaN', 0, 1);

-- name: fee_small_units_skipped_overflow
INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (25, true, '32767.5', 0, 1);

-- name: fee_regular_units_positive_half
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (10, false, '1.5', 2, 2);

-- name: fee_regular_units_negative_half
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (11, false, '-1.5', -2, -2);

-- name: fee_regular_units_trailing_zero
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (12, false, '130.000', 130, 130);

-- name: fee_regular_units_exponent
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (13, false, '1e3', 1000, 1000);

-- name: fee_regular_units_wrong_rounded
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (14, false, '1.5', 1, 1);

-- name: fee_regular_units_wrong_numeric
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (15, false, '1.5', 2, 3);

-- name: fee_regular_units_null
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (16, false, NULL, NULL, NULL);

-- name: fee_regular_units_maximum
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (17, false, '2147483647.49', '2147483647', '2147483647');

-- name: fee_regular_units_minimum
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (18, false, '-2147483648.49', '-2147483648', '-2147483648');

-- name: fee_regular_units_maximum_overflow
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (19, false, '2147483647.5', 0, 0);

-- name: fee_regular_units_minimum_overflow
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (20, false, '-2147483648.5', 0, 0);

-- name: fee_regular_units_nan
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (21, false, 'NaN', 0, 0);

-- name: fee_regular_units_infinity
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (22, false, 'Infinity', 0, 0);

-- name: fee_regular_units_negative_infinity
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (23, false, '-Infinity', 0, 0);

-- name: fee_regular_units_skipped_nan
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (24, true, 'NaN', 0, 1);

-- name: fee_regular_units_skipped_overflow
INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (25, true, '2147483647.5', 0, 1);

-- name: fee_bulk_units_positive_half
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (10, false, '1.5', 2, 2);

-- name: fee_bulk_units_negative_half
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (11, false, '-1.5', -2, -2);

-- name: fee_bulk_units_trailing_zero
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (12, false, '130.000', 130, 130);

-- name: fee_bulk_units_exponent
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (13, false, '1e3', 1000, 1000);

-- name: fee_bulk_units_wrong_rounded
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (14, false, '1.5', 1, 1);

-- name: fee_bulk_units_wrong_numeric
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (15, false, '1.5', 2, 3);

-- name: fee_bulk_units_null
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (16, false, NULL, NULL, NULL);

-- name: fee_bulk_units_maximum
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (17, false, '9223372036854775807.49', '9223372036854775807', '9223372036854775807');

-- name: fee_bulk_units_minimum
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (18, false, '-9223372036854775808.49', '-9223372036854775808', '-9223372036854775808');

-- name: fee_bulk_units_maximum_overflow
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (19, false, '9223372036854775807.5', 0, 0);

-- name: fee_bulk_units_minimum_overflow
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (20, false, '-9223372036854775808.5', 0, 0);

-- name: fee_bulk_units_nan
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (21, false, 'NaN', 0, 0);

-- name: fee_bulk_units_infinity
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (22, false, 'Infinity', 0, 0);

-- name: fee_bulk_units_negative_infinity
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (23, false, '-Infinity', 0, 0);

-- name: fee_bulk_units_skipped_nan
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (24, true, 'NaN', 0, 1);

-- name: fee_bulk_units_skipped_overflow
INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount)
VALUES (25, true, '9223372036854775807.5', 0, 1);
