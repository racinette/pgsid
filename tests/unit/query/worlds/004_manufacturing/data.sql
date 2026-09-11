-- Runs at both live checkpoints have completed and missing inspections. Device
-- 2 has only a scheduled inspection and device 3 has no run, so the lateral
-- and grouped-join fixtures both have present and absent optional-row arms.

INSERT INTO devices
  (id, serial_number, station_name, state, commissioned_on, retired_on, calibration_due)
VALUES
  (1, 'MX-100', 'Assembly Press', 'active', '2023-02-10', NULL, '2026-12-01'),
  (2, 'MX-200', 'Paint Booth', 'active', '2023-06-15', NULL, NULL),
  (3, 'MX-300', 'Retired Gauge', 'retired', '2020-01-20', '2025-04-30', '2025-01-20');

INSERT INTO production_runs
  (id, device_id, run_code, product_code, planned_qty, produced_qty, state,
   started_at, finished_at, notes)
VALUES
  (1, 1, 'RUN-A', 'GEAR-40', 100, 98, 'completed',
   '2026-01-05 06:00+00', '2026-01-05 14:20+00', 'Two units rejected'),
  (2, 1, 'RUN-B', 'SHAFT-12', 50, 20, 'running',
   '2026-01-06 07:00+00', NULL, NULL),
  (3, 2, 'RUN-C', 'PANEL-8', 75, NULL, 'planned',
   '2026-01-07 08:00+00', NULL, NULL),
  (4, 2, 'RUN-D', 'PANEL-9', 40, 40, 'completed',
   '2026-01-08 08:00+00', '2026-01-08 12:00+00', NULL),
  (5, 2, 'RUN-E', 'PANEL-10', 60, 12, 'running',
   '2026-01-09 08:00+00', NULL, 'Awaiting inspection');

INSERT INTO inspections
  (id, run_id, device_id, inspection_kind, status, scheduled_at, inspected_at,
   inspector, outcome, notes)
VALUES
  (1, 1, 1, 'final', 'completed', '2026-01-05 14:00+00',
   '2026-01-05 14:10+00', 'Elena Morozova', 'pass', NULL),
  (2, 2, 1, 'in_process', 'completed', '2026-01-06 09:00+00',
   '2026-01-06 09:05+00', 'Omar Haddad', 'adjust', 'Pressure drift'),
  (3, 1, 1, 'startup', 'completed', '2026-01-05 06:00+00',
   '2026-01-05 06:05+00', 'Omar Haddad', 'pass', NULL),
  (4, 3, 2, 'startup', 'scheduled', '2026-01-07 08:00+00',
   NULL, NULL, NULL, 'Run not released'),
  (5, 4, 2, 'safety', 'cancelled', '2026-01-08 10:00+00',
   NULL, NULL, NULL, 'Station stopped');

INSERT INTO inspection_results
  (id, inspection_id, metric_name, measured_value, lower_limit, upper_limit,
   recorded_at, comment)
VALUES
  (1, 1, 'temperature', 21.0, 18.0, 24.0, '2026-01-05 14:12+00', NULL),
  (2, 1, 'surface_finish', NULL, NULL, NULL, '2026-01-05 14:13+00', 'pending lab'),
  (3, 2, 'vibration', 4.2, 0.0, 3.0, '2026-01-06 09:07+00', 'recheck required');
