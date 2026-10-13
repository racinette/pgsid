-- name: shift_clock_pass
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Afternoon', '12:00', '16:00', '4 hours');
-- name: shift_clock_reject
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Reversed', '16:00', '12:00', '-4 hours');
-- name: shift_duration_reject
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Wrong duration', '12:00', '16:00', '3 hours');
-- name: shift_clock_null
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Open ended', '12:00', NULL, NULL);
-- name: shift_end_of_day
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Full day', '00:00', '24:00', '24 hours');
-- name: shift_end_marker
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Closing marker', '24:00', '24:00', '0');
-- name: shift_microsecond
INSERT INTO shift_templates (id, label, starts_at, ends_at, planned_duration) VALUES (2, 'Precision', '12:00:00.000001', '12:00:00.000002', '1 microsecond');
-- name: service_month_equivalence
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, '30 days', '1 month', '30 days');
-- name: service_month_reject
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, '30 days', '1 month 1 microsecond', '30 days');
-- name: service_reversed_bounds
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, '5 hours', '4 hours', '3 hours');
-- name: service_cancelled_components
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, '0', '1 month -30 days', '0');
-- name: service_duration_null
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, NULL, '4 hours', NULL);
-- name: service_infinite_bounds
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, '-infinity', '4 hours', 'infinity');
-- name: service_infinite_subtraction
INSERT INTO service_windows (id, template_id, minimum_duration, planned_duration, maximum_duration) VALUES (2, 1, '0', 'infinity', 'infinity');
-- name: dispatch_adjustment_pass
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', '12:00+02', '1 hour', '13:00+02', false);
-- name: dispatch_clock_reject
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '11:00', '12:00+02', '1 hour', '13:00+02', false);
-- name: dispatch_adjustment_reject
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', '12:00+02', '1 hour', '14:00+02', false);
-- name: dispatch_offset_identity_reject
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', '12:00+02', '0', '11:00+01', false);
-- name: dispatch_wrap_midnight
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '23:30', '23:30-05:30', '1 hour', '00:30-05:30', false);
-- name: dispatch_negative_wrap
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '00:30', '00:30+00', '-1 hour', '23:30+00', false);
-- name: dispatch_end_of_day_wrap
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '24:00', '24:00+15:59:59', '0', '00:00+15:59:59', false);
-- name: dispatch_ignores_calendar_interval
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', '12:00+02', '1 month 3 days 1 hour', '13:00+02', false);
-- name: dispatch_infinite_interval
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', '12:00+02', 'infinity', '12:00+02', false);
-- name: dispatch_skips_infinite_interval
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', '12:00+02', 'infinity', '12:00+02', true);
-- name: dispatch_null_values
INSERT INTO zoned_dispatches (id, template_id, local_departure, zoned_departure, adjustment, adjusted_departure, skip_adjustment) VALUES (2, 1, '12:00', NULL, NULL, NULL, false);
