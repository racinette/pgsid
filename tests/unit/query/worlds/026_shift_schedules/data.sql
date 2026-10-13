INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (1, 'Morning service', '08:00', '12:00', '4 hours');
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (1, 1, '3 hours', '4 hours', '5 hours');
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (1, 1, '08:00', '08:00+02', '15 minutes', '08:15+02', false);
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (1, 1, '4 hours', '4 hours', false);

INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (1, 1, '2000-01-01', '12:34:56.123456', '12:34:56.123456+02', '2000-01-01 12:34:56.123456', '2000-01-01 10:34:56.123456+00', false);

INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (1, 1, '040506', '040506+02', '04:05:06', '04:05:06+02', '04:05:06+02', false);
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (1, 1, 0, 1, 0, 0, 0, 0, 0, '1 month', '2000-01-31', '2000-01-31 12:00', '2000-02-29', '2000-02-29 12:00', '29 days', false);
