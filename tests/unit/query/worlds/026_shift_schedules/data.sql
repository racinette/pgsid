INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (1, 'Morning service', '08:00', '12:00', '4 hours');
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (1, 1, '3 hours', '4 hours', '5 hours');
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (1, 1, '08:00', '08:00+02', '15 minutes', '08:15+02', false);
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (1, 1, '4 hours', '4 hours', false);
