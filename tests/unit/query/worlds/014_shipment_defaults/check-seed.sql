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

