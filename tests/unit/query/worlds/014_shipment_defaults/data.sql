INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (1, 7, 3, 5, 7, 7, 14, 5);

INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (1, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, true);

INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (1, 'first', 'second', 'first', 'A', 'B', 'A', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'dispatched');
