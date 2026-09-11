-- Nodes 1, 2, 5, and 6 form an energized recursive path. Node 3 is an
-- offline descendant with no energizing timestamp, which weakens the nearby
-- unrestricted recursion. Node 6 has no incident, while nodes 1, 2, and 5 do,
-- witnessing both arms of the recursive incident-summary presence group.

INSERT INTO grid_nodes
  (id, parent_id, node_code, node_state, region, commissioned_on,
   energized_at, retired_on, capacity_mw)
VALUES
  (1, NULL, 'SUB-NORTH', 'energized', 'North', '2022-01-10', '2022-01-11 06:00+00', NULL, 120),
  (2, 1, 'FDR-N1', 'energized', 'North', '2022-02-01', '2022-02-01 08:00+00', NULL, 45),
  (3, 2, 'FDR-N1-B', 'offline', 'North', '2023-04-10', NULL, NULL, NULL),
  (4, 1, 'FDR-OLD', 'retired', 'North', '2018-06-01', '2018-06-02 07:00+00', '2025-01-15', NULL),
  (5, 2, 'TX-N1-5', 'energized', 'North', '2024-03-12', '2024-03-12 09:00+00', NULL, 8),
  (6, 2, 'TX-N1-6', 'energized', 'North', '2024-04-20', '2024-04-20 09:30+00', NULL, 9);

INSERT INTO meters
  (id, node_id, serial_number, meter_kind, installed_on, retired_on,
   interval_minutes, calibration_due)
VALUES
  (1, 1, 'GM-100', 'substation', '2022-01-10', NULL, 15, '2027-01-10'),
  (2, 2, 'GM-200', 'feeder', '2022-02-01', NULL, 5, '2027-02-01'),
  (3, 3, 'GM-300', 'feeder', '2023-04-10', NULL, NULL, NULL),
  (4, 5, 'GM-500', 'transformer', '2024-03-12', NULL, 15, NULL);

INSERT INTO meter_readings
  (id, meter_id, observed_at, quality, demand_mw, voltage_kv, suppressed_at, note)
VALUES
  (1, 1, '2026-08-01 10:00+00', 'accepted', 72.5, 110, NULL, 'morning peak'),
  (2, 1, '2026-08-01 10:15+00', 'missing', NULL, NULL, NULL, 'telemetry gap'),
  (3, 2, '2026-08-01 10:05+00', 'suppressed', 31.2, 35, '2026-08-01 10:06+00', NULL),
  (4, 4, '2026-08-01 10:10+00', 'accepted', 6.1, 10, NULL, NULL);

INSERT INTO grid_incidents
  (id, node_id, reading_id, status, severity, opened_at, resolved_at, assignee, summary)
VALUES
  (1, 1, 1, 'investigating', 3, '2026-08-01 10:02+00', NULL, 'Elena Morozova', 'High demand'),
  (2, 2, 3, 'suppressed', 2, '2026-08-01 10:07+00', NULL, NULL, NULL),
  (3, 3, NULL, 'resolved', 1, '2026-07-10 08:00+00', '2026-07-10 09:00+00', 'Omar Haddad', 'Planned isolation'),
  (4, 2, 2, 'resolved', 2, '2026-07-30 11:00+00', '2026-07-30 11:30+00', 'Omar Haddad', NULL),
  (5, 5, 1, 'open', 1, '2026-08-01 10:20+00', NULL, NULL, 'Downstream review');

INSERT INTO dispatch_actions
  (id, incident_id, operator_name, dispatched_at, completed_at, outcome, suppression_reason)
VALUES
  (1, 2, 'Night Control', '2026-08-01 10:08+00', NULL, NULL, 'duplicate telemetry'),
  (2, 1, 'North Desk', '2026-08-01 10:04+00', '2026-08-01 10:12+00', 'load shifted', NULL);
