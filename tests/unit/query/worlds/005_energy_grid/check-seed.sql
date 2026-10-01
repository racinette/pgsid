-- name: incident_with_severity
INSERT INTO grid_incidents (id, node_id, status, severity, opened_at, reading_id, assignee)
VALUES (100, 1, 'open', 1, '2026-08-02 10:00+00', 1, NULL);
-- name: incident_without_severity
INSERT INTO grid_incidents (id, node_id, status, severity, opened_at, reading_id, assignee)
VALUES (100, 1, 'open', 0, '2026-08-02 10:00+00', 1, NULL);
-- name: incident_without_owner_or_reading
INSERT INTO grid_incidents (id, node_id, status, severity, opened_at, reading_id, assignee)
VALUES (100, 1, 'open', 1, '2026-08-02 10:00+00', NULL, NULL);

-- name: grid_node_without_parent
INSERT INTO grid_nodes (id, parent_id, node_code, node_state, region, commissioned_on) VALUES (10000, NULL, 'CHECK-NODE', 'offline', 'North', '2024-01-01');
-- name: grid_node_with_existing_parent
INSERT INTO grid_nodes (id, parent_id, node_code, node_state, region, commissioned_on) VALUES (10000, 1, 'CHECK-NODE', 'offline', 'North', '2024-01-01');
-- name: grid_node_as_own_parent
INSERT INTO grid_nodes (id, parent_id, node_code, node_state, region, commissioned_on) VALUES (10000, 10000, 'CHECK-NODE', 'offline', 'North', '2024-01-01');
-- name: meter_without_interval
INSERT INTO meters (id, node_id, serial_number, meter_kind, installed_on, interval_minutes) VALUES (10000, 1, 'CHECK-METER', 'demand', '2024-01-01', NULL);
-- name: meter_with_zero_interval
INSERT INTO meters (id, node_id, serial_number, meter_kind, installed_on, interval_minutes) VALUES (10000, 1, 'CHECK-METER', 'demand', '2024-01-01', 0);
-- name: meter_with_minimum_integer_interval
INSERT INTO meters (id, node_id, serial_number, meter_kind, installed_on, interval_minutes) VALUES (10000, 1, 'CHECK-METER', 'demand', '2024-01-01', -2147483648);
-- name: meter_with_maximum_integer_interval
INSERT INTO meters (id, node_id, serial_number, meter_kind, installed_on, interval_minutes) VALUES (10000, 1, 'CHECK-METER', 'demand', '2024-01-01', 2147483647);
-- name: incident_with_assignee_only
INSERT INTO grid_incidents (id, node_id, reading_id, status, severity, opened_at, assignee) VALUES (10000, 1, NULL, 'investigating', 1, '2026-08-02 10:00+00', 'Daria');
-- name: incident_with_reading_and_assignee
INSERT INTO grid_incidents (id, node_id, reading_id, status, severity, opened_at, assignee) VALUES (10000, 1, 1, 'investigating', 2147483647, '2026-08-02 10:00+00', 'Daria');
-- name: dispatch_without_suppression
INSERT INTO dispatch_actions (id, incident_id, operator_name, dispatched_at, suppression_reason) VALUES (10000, 1, 'North Desk', '2026-08-02 10:00+00', NULL);
-- name: missing_reading_without_note
INSERT INTO meter_readings (id, meter_id, observed_at, quality, demand_mw, voltage_kv, note) VALUES (10000, 1, '2026-08-02 10:00+00', 'missing', NULL, NULL, NULL);
