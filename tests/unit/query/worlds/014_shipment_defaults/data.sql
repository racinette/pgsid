INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (1, 7, 3, 5, 7, 7, 14, 5);

INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (1, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, true);

INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (1, 'first', 'second', 'first', 'A', 'B', 'A', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'dispatched');

INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (1, false, -12.3400, 8.5, -1, 8.5, -12.34, 12.34, 12.34, -12.34, -1);

INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (1, false, -12.3400, 4, 2, -12.34);

INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (1, false, -12.34, -12, -13);

INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (1, false, -12.3450, 2, -12.35, -12, -12.34, -12);

INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount) VALUES (1, false, 1.5, 2, 2);

INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount) VALUES (1, false, 1.5, 2, 2);

INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount) VALUES (1, false, 1.5, 2, 2);
