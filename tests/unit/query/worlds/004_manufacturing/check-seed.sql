-- name: planned_run_with_quantity
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at)
VALUES (100, 1, 'RUN-CHECK', 'GEAR-40', 100, NULL, 'planned', '2026-01-10 06:00+00');
-- name: run_at_integer_maximum
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at)
VALUES (100, 1, 'RUN-CHECK', 'GEAR-40', 2147483647, 2147483647, 'running', '2026-01-10 06:00+00');
-- name: run_with_negative_produced_quantity
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at)
VALUES (100, 1, 'RUN-CHECK', 'GEAR-40', 100, -2147483648, 'running', '2026-01-10 06:00+00');

-- name: run_produced_quantity_equals_plan
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at) VALUES (10000, 1, 'RUN-CHECK-EXTRA', 'GEAR-40', 10, 10, 'running', '2026-01-10 06:00+00');
-- name: run_produced_quantity_exceeds_plan
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at) VALUES (10000, 1, 'RUN-CHECK-EXTRA', 'GEAR-40', 10, 11, 'running', '2026-01-10 06:00+00');
-- name: run_zero_quantities
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at) VALUES (10000, 1, 'RUN-CHECK-EXTRA', 'GEAR-40', 0, 0, 'running', '2026-01-10 06:00+00');
-- name: run_negative_plan_without_production
INSERT INTO production_runs (id, device_id, run_code, product_code, planned_qty, produced_qty, state, started_at) VALUES (10000, 1, 'RUN-CHECK-EXTRA', 'GEAR-40', -2147483648, NULL, 'planned', '2026-01-10 06:00+00');
-- name: scheduled_inspection_without_outcome
INSERT INTO inspections (id, run_id, device_id, inspection_kind, status, scheduled_at, outcome, notes) VALUES (10000, 1, 1, 'safety', 'scheduled', '2026-01-10 10:00+00', NULL, NULL);
-- name: inspection_with_repeated_outcome_note
INSERT INTO inspections (id, run_id, device_id, inspection_kind, status, scheduled_at, inspected_at, inspector, outcome, notes) VALUES (10000, 1, 1, 'safety', 'completed', '2026-01-10 10:00+00', '2026-01-10 11:00+00', 'Daria', 'pass', 'pass');
-- name: measurement_without_comment
INSERT INTO inspection_results (id, inspection_id, metric_name, measured_value, lower_limit, upper_limit, recorded_at, comment) VALUES (10000, 1, 'check-temperature', 21, 18, 24, '2026-01-10 10:00+00', NULL);
-- name: measurement_with_reversed_limits
INSERT INTO inspection_results (id, inspection_id, metric_name, measured_value, lower_limit, upper_limit, recorded_at, comment) VALUES (10000, 1, 'check-temperature', 21, 24, 18, '2026-01-10 10:00+00', NULL);
-- name: measurement_comment_repeats_name
INSERT INTO inspection_results (id, inspection_id, metric_name, measured_value, recorded_at, comment) VALUES (10000, 1, 'check-temperature', 21, '2026-01-10 10:00+00', 'check-temperature');
-- name: retired_device_without_retirement_date
INSERT INTO devices (id, serial_number, station_name, state, commissioned_on, retired_on) VALUES (10000, 'CHECK-DEVICE', 'Gauge Bench', 'retired', '2024-01-01', NULL);
