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
-- name: duration_import_month_equivalence
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1 month', '30 days', false);
-- name: duration_import_reject
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1 month', '29 days', false);
-- name: duration_import_unit_tie
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1.5 microseconds', '1 microsecond', false);
-- name: duration_import_clock_tie
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '00:00:00.0000015', '2 microseconds', false);
-- name: duration_import_iso
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, 'P1Y2M3DT4H5M6.1S', '1 year 2 mons 3 days 04:05:06.1', false);
-- name: duration_import_mixed_sign_iso
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, 'P-1DT2H', '-1 day +2 hours', false);
-- name: duration_import_minimum_time
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '-9223372036854.775808 seconds', '-9223372036854.775808 seconds', false);
-- name: duration_import_infinity
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '-infinity', '-infinity', false);
-- name: duration_import_duplicate_fields
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1 month 2 months', '0', false);
-- name: duration_import_overflow
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '2147483648 months', '0', false);
-- name: duration_import_skip_invalid
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1 month 2 months', '0', true);
-- name: duration_import_null
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, NULL, NULL, false);
-- name: duration_import_null_reject
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, NULL, '0', false);

-- name: departure_fixed_offset
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '2000-01-01', '12:34:56.123456', '12:34:56.123456-05:30', '2000-01-01 12:34:56.123456', '2000-01-01 18:04:56.123456+00', false);

-- name: departure_end_of_day
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '1999-12-31', '24:00', '24:00+02', '2000-01-01 00:00', '1999-12-31 22:00+00', false);

-- name: departure_local_mismatch
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '2000-01-01', '12:00', '12:00+02', '2000-01-01 13:00', '2000-01-01 10:00+00', false);

-- name: departure_instant_mismatch
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '2000-01-01', '12:00', '12:00+02', '2000-01-01 12:00', '2000-01-01 11:00+00', false);

-- name: departure_infinite_day
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, 'infinity', '12:00', '12:00+02', 'infinity', 'infinity', false);

-- name: departure_negative_infinite_day
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '-infinity', '12:00', '12:00+02', '-infinity', '-infinity', false);

-- name: departure_out_of_timestamp_range
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '294277-01-01', '00:00', '00:00+02', NULL, NULL, false);

-- name: departure_overflow_after_clock
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '294276-12-31', '24:00', '24:00+00', NULL, NULL, false);

-- name: departure_skip_overflow
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '400000-01-01', '12:00', '12:00+02', NULL, NULL, true);

-- name: departure_null_clocks
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '2000-01-01', NULL, NULL, NULL, NULL, false);

-- name: departure_null_mismatch
INSERT INTO departure_plans (id, template_id, service_day, local_departure, zoned_departure, recorded_local, recorded_instant, skip_validation) VALUES (2, 1, '2000-01-01', NULL, NULL, '2000-01-01 00:00', NULL, false);

-- name: duration_import_compact
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1day', '1 day', false);

-- name: duration_import_year_month
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1-2', '14 months', false);

-- name: duration_import_compact_reject
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, '1day2hours', '0', false);

-- name: duration_import_invalid_word
INSERT INTO duration_imports (id, template_id, raw_duration, expected_duration, skip_import) VALUES (2, 1, 'now', '0', false);

-- name: clock_import_compact
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '040506', '040506+02', '04:05:06', '04:05:06+02', '04:05:06+02', false);

-- name: clock_import_fractional_minutes
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '12:30.5', '12:30.5-05:30', '00:12:30.5', '00:12:30.5-05:30', '00:12:30.5-05:30', false);

-- name: clock_import_meridian
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '12:00 PM +02', '12:00PM+02', '12:00', '12:00+02', '12:00:00+02', false);

-- name: clock_import_dated_clock
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '2000-02-29 12:00', '2000-02-29 12:00 PM +02', '12:00', '12:00+02', '12:00:00+02', false);

-- name: clock_import_end_of_day
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '240000', '240000+00', '24:00', '24:00+00', '24:00:00+00', false);

-- name: clock_import_local_mismatch
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '12:00', '12:00+02', '13:00', '12:00+02', '12:00:00+02', false);

-- name: clock_import_zoned_mismatch
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '12:00', '12:00+02', '12:00', '12:00+03', '12:00:00+03', false);

-- name: clock_import_label_mismatch
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '12:00', '12:00+02', '12:00', '12:00+02', '12:00:00+03', false);

-- name: clock_import_invalid_calendar
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '2000-02-31 12:00', '12:00+02', '12:00', '12:00+02', '12:00:00+02', false);

-- name: clock_import_invalid_separator
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '2000-01-01T12:00+02', '12:00+02', '12:00', '12:00+02', '12:00:00+02', false);

-- name: clock_import_invalid_zone
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '12:00', '12:00+16', '12:00', '12:00+02', '12:00:00+02', false);

-- name: clock_import_skip_invalid
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, '25:00', 'nonsense', '12:00', '12:00+02', 'unformatted', true);

-- name: clock_import_null
INSERT INTO clock_imports (id, template_id, raw_local, raw_zoned, expected_local, expected_zoned, printed_label, skip_import) VALUES (2, 1, NULL, NULL, NULL, NULL, NULL, false);

-- name: maintenance_leap_month
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 1, 0, 0, 0, 0, 0, '1 month', '2000-01-31', '2000-01-31 12:00', '2000-02-29', '2000-02-29 12:00', '29 days', false);

-- name: maintenance_ordinary_month
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 1, 0, 0, 0, 0, 0, '1 month', '2001-01-31', '2001-01-31 12:00', '2001-02-28', '2001-02-28 12:00', '28 days', false);

-- name: maintenance_negative_month
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, -1, 0, 0, 0, 0, 0, '-1 month', '2000-03-31', '2000-03-31 12:00', '2000-02-29', '2000-02-29 12:00', '-31 days', false);

-- name: maintenance_day_and_clock
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 1, -1, 0, 0, '1 day -1 hour', '2000-01-31', '2000-01-31 12:00', '2000-01-31 23:00', '2000-02-01 11:00', '23 hours', false);

-- name: maintenance_second_rounding
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0.0000015, '2 microseconds', '2000-01-01', '2000-01-01 12:00', '2000-01-01 00:00:00.000002', '2000-01-01 12:00:00.000002', '2 microseconds', false);

-- name: maintenance_parts_mismatch
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0, '1 hour', '2000-01-01', '2000-01-01 12:00', '2000-01-01 01:00', '2000-01-01 13:00', '1 hour', false);

-- name: maintenance_day_mismatch
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01 01:00', '2000-01-01 12:00', '0', false);

-- name: maintenance_clock_mismatch
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01', '2000-01-01 13:00', '1 hour', false);

-- name: maintenance_elapsed_mismatch
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01', '2000-01-01 12:00', '1 hour', false);

-- name: maintenance_intermediate_year_overflow
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 178956971, -12, 0, 0, 0, 0, 0, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01', '2000-01-01 12:00', '0', false);

-- name: maintenance_intermediate_week_overflow
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 306783379, -7, 0, 0, 0, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01', '2000-01-01 12:00', '0', false);

-- name: maintenance_float_overflow
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 1e308::float8, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01', '2000-01-01 12:00', '0', false);

-- name: maintenance_nonfinite_seconds
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 'NaN'::float8, '0', '2000-01-01', '2000-01-01 12:00', '2000-01-01', '2000-01-01 12:00', '0', false);

-- name: maintenance_timestamp_day_bound
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0, '0', '294277-01-01', '2000-01-01 12:00', NULL, '2000-01-01 12:00', '0', false);

-- name: maintenance_timestamp_clock_bound
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 1, 0, 0, 0, '1 day', '2000-01-01', '294276-12-31 23:59:59.999999', '2000-01-02', NULL, NULL, false);

-- name: maintenance_infinite_difference
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 0, 0, 0, 0, 0, 0, 0, '0', '2000-01-01', 'infinity', '2000-01-01', 'infinity', NULL, false);

-- name: maintenance_skip_errors
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, 178956971, -12, 0, 0, 0, 0, 1e308::float8, '0', '294277-01-01', 'infinity', NULL, NULL, NULL, true);

-- name: maintenance_null
INSERT INTO maintenance_adjustments (id, template_id, duration_years, duration_months, duration_weeks, duration_days, duration_hours, duration_minutes, duration_seconds, expected_duration, service_day, requested_at, expected_day, expected_at, expected_elapsed, skip_adjustment) VALUES (2, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2000-01-01', NULL, NULL, NULL, NULL, false);

-- name: audit_clock_seconds
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_epoch
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '00:00:00.000001', '00:00:00.000001+15:59:59', 'epoch', '9223372036854775807', '-1 hour', false, '0.000001', '-57598.999999', '1e-06', '-57598.999999', '-1905060026', '-1768939542', '-7235533053458395473', '6321944787552428439', '23:00:00.000001', '23:00:00.000001+15:59:59');

-- name: audit_clock_end_marker
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '24:00', '24:00+00', 'hour', '0', '0', false, '24', '24', '24', '24', '-2053980660', '1781300899', '8030965169264967180', '6258769810305089187', '00:00:00', '00:00:00+00');

-- name: audit_clock_fraction
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '23:59:59.999999', '23:59:59.999999-15:59:59', 'milliseconds', '4294967295', '1 month 2 days 1 hour', false, '59999.999', '59999.999', '59999.999', '59999.999', '38296624', '-180542231', '-7482101991032798787', '265153594208579201', '00:59:59.999999', '00:59:59.999999-15:59:59');

-- name: audit_clock_wrong_local_field
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '57.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_zoned_field
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '57.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_local_legacy
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '57.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_zoned_legacy
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '57.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_local_digest
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151981', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_zoned_digest
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989843', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_local_seeded_digest
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766874', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_zoned_seeded_digest
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536948', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_recorded_local
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '00:00', '13:34:56.123456-05:30');

-- name: audit_clock_wrong_recorded_zoned
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'second', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '00:00+00');

-- name: audit_clock_unsupported_field
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'day', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_unrecognized_field
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'foo', '-9223372036854775808', '1 hour', false, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_skipped_field
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', '12:34:56.123456', '12:34:56.123456-05:30', 'foo', '-9223372036854775808', 'infinity', true, '56.123456', '56.123456', '56.123456', '56.123456', '-836151982', '-1181989844', '2244728923395766873', '7351998219920536947', '13:34:56.123456', '13:34:56.123456-05:30');

-- name: audit_clock_null
INSERT INTO shift_audit_fields (id, template_id, local_clock, zoned_clock, field_name, hash_seed, adjustment, skip_audit, local_field, zoned_field, local_legacy, zoned_legacy, local_digest, zoned_digest, local_seeded_digest, zoned_seeded_digest, recorded_local, recorded_zoned) VALUES ('2', '1', NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: audit_span_epoch
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'day', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_negative
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '-1 year -2 months -3 days -25:01:59.999999', 'second', 'millisecond', '9223372036854775807', false, '-59.999999', '-59.999999', '-1 years -2 mons -3 days -25:01:59.999', '135921666', '-6958935400198257681');

-- name: audit_span_minimum_months
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '-2147483648 months', 'quarter', 'quarter', '0', false, '1', '1', '-178956970 years -6 mons', '545726794', '-3068577755319295670');

-- name: audit_span_minimum_time
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '-9223372036854.775808 seconds', 'epoch', 'hour', '4294967295', false, '-9223372036854.775808', '-9223372036854.775', '-2562047788:00:00', '-96758253', '6678990371818108661');

-- name: audit_span_infinity
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', 'infinity', 'year', 'year', '-1', false, 'Infinity', 'Infinity', 'infinity', '-523051888', '-1123889875554259596');

-- name: audit_span_infinity_null_field
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '-infinity', 'month', 'second', '1', false, NULL, NULL, '-infinity', '810964538', '-6405518938190579824');

-- name: audit_span_wrong_recorded_field
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'day', '-9223372036854775808', false, '37090920.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_wrong_recorded_legacy
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'day', '-9223372036854775808', false, '37090919.999999', '37090920.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_wrong_digest
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'day', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788118', '-4565647013232157916');

-- name: audit_span_wrong_seeded_digest
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'day', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157915');

-- name: audit_span_wrong_truncation
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'day', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '0', '54788117', '-4565647013232157916');

-- name: audit_span_unsupported_week
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'epoch', 'week', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_unsupported_zone
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'timezone', 'day', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_bad_field
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'foo', 'day', '-9223372036854775808', false, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_skip_error
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', '1 year 2 months 3 days 25:01:59.999999', 'foo', 'week', '-9223372036854775808', true, '37090919.999999', '37090919.999999', '1 year 2 mons 3 days', '54788117', '-4565647013232157916');

-- name: audit_span_null
INSERT INTO duration_audit_fields (id, template_id, duration, field_name, truncation_field, hash_seed, skip_audit, recorded_field, recorded_legacy, recorded_truncation, digest, seeded_digest) VALUES ('2', '1', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL);

-- name: event_bin_positive
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_negative
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', '1999-12-31 23:59:59.999999', '2000-01-01 00:00', '1999-12-31 23:59:59.999999+00', '2000-01-01 00:00+00', false, '1999-12-31 23:45:00', '1999-12-31 23:45:00+00', '-00:00:00.000001');

-- name: event_bin_exact
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '1 microsecond', '2000-01-01 00:00:00.000001', '2000-01-01 00:00', '2000-01-01 00:00:00.000001+00', '2000-01-01 00:00+00', false, '2000-01-01 00:00:00.000001', '2000-01-01 00:00:00.000001+00', '00:00:00.000001');

-- name: event_bin_age_leap
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '1 day', '2000-03-01 00:00', '2000-02-29 23:59:59.999999', '2000-03-01 00:00+00', '2000-02-29 23:59:59.999999+00', false, '2000-02-29 23:59:59.999999', '2000-02-29 23:59:59.999999+00', '00:00:00.000001');

-- name: event_bin_age_reverse
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '1 day', '1900-02-28 00:00', '1900-03-31 12:00', '1900-02-28 00:00+00', '1900-03-31 12:00+00', false, '1900-02-27 12:00:00', '1900-02-27 12:00:00+00', '-1 mons -3 days -12:00:00');

-- name: event_bin_infinity
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '0', 'infinity', '2000-01-01 00:00', 'infinity', '2000-01-01 00:00+00', false, 'infinity', 'infinity', 'infinity');

-- name: event_bin_wrong_recorded_local
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-01-01 00:00+00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_wrong_recorded_instant
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-01-01 00:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_wrong_recorded_age
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '0');

-- name: event_bin_invalid_0
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '0', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_invalid_1_microsecond
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '-1 microsecond', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_invalid_1_month
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '1 month', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_invalid_infinity
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', 'infinity', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_invalid_106751992_days_9223372036854_seconds
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '106751992 days -9223372036854 seconds', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_bad_instant_origin
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', '2000-03-01 12:34:56.123456', '2000-01-31 12:00', '2000-03-01 12:34:56.123456+00', 'infinity', false, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_infinite_age_error
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '15 minutes', 'infinity', 'infinity', '2000-03-01 12:34:56.123456+00', '2000-01-31 12:00+00', false, 'infinity', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_skip_errors
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', '0', '2000-03-01 12:34:56.123456', 'infinity', '2000-03-01 12:34:56.123456+00', 'infinity', true, '2000-03-01 12:30:00', '2000-03-01 12:30:00+00', '1 mon 1 day 00:34:56.123456');

-- name: event_bin_null
INSERT INTO event_bucket_records (id, template_id, bucket_width, observed_local, origin_local, observed_instant, origin_instant, skip_audit, recorded_local, recorded_instant, recorded_age) VALUES ('2', '1', NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);

-- name: clock_tolerance_equal
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '1 hour'::interval, false, true, true, true);

-- name: clock_tolerance_no_wrap
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '00:30'::time, '23:30'::time, '00:30+02'::timetz, '23:30+02'::timetz, '1 hour'::interval, false, true, true, true);

-- name: clock_tolerance_offset_order
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '12:00'::time, '12:00'::time, '11:00+01'::timetz, '12:00+02'::timetz, '0'::interval, false, true, true, false);

-- name: clock_tolerance_ignore_calendar
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '-1 month -2 days'::interval, false, true, false, false);

-- name: clock_tolerance_infinite
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, 'infinity'::interval, false, true, true, true);

-- name: clock_tolerance_overflow
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '9223372036854.775807 seconds'::interval, false, true, true, true);

-- name: clock_tolerance_utc_wrap
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '00:00'::time, '13:00+02'::timetz, '00:00-15:59:59'::timetz, '9223372036854.775807 seconds'::interval, true, true, false, false);

-- name: clock_tolerance_wide_zone
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, timezone(interval '2147483648 seconds',timetz '12:00+02'), timezone(interval '2147483647 seconds',timetz '12:00+02'), '1 hour'::interval, false, true, true, true);

-- name: clock_tolerance_wrong_recorded_local
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '1 hour'::interval, false, true, false, true);

-- name: clock_tolerance_wrong_recorded_zoned
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '1 hour'::interval, false, true, true, false);

-- name: clock_tolerance_negative
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '-1 microsecond'::interval, false, true, true, true);

-- name: clock_tolerance_skipped_negative
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, true, '13:00'::time, '12:00'::time, '13:00+02'::timetz, '12:00+02'::timetz, '-infinity'::interval, false, true, true, true);

-- name: clock_tolerance_null
INSERT INTO clock_tolerances (id, template_id, skip_validation, candidate_clock, base_clock, candidate_zoned, base_zoned, tolerance, subtract_offset, compare_less, recorded_local, recorded_zoned) VALUES (2, 1, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: calendar_tolerance_month_end
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month'::interval, false, true, true, true, true);

-- name: calendar_tolerance_cancelled_span
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month -30 days'::interval, false, true, false, false, false);

-- name: calendar_tolerance_mixed_positive
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '-1 month 31 days'::interval, false, true, false, false, false);

-- name: calendar_tolerance_infinite_boundary
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, 'infinity'::date, '2000-02-29 12:00'::timestamp, 'infinity'::timestamp, '60 days'::interval, 'infinity'::interval, 'infinity'::interval, true, true, true, true, true);

-- name: calendar_tolerance_wrong_recorded_day
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month'::interval, false, true, false, true, true);

-- name: calendar_tolerance_wrong_recorded_at
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month'::interval, false, true, true, false, true);

-- name: calendar_tolerance_wrong_recorded_duration
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month'::interval, false, true, true, true, false);

-- name: calendar_tolerance_negative
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month -31 days'::interval, false, true, true, true, true);

-- name: calendar_tolerance_date_bounds
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '400000-01-01'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '1 month'::interval, false, true, true, true, true);

-- name: calendar_tolerance_timestamp_bounds
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '294276-12-31 23:59:59.999999'::timestamp, '60 days'::interval, '1 month'::interval, '1 day'::interval, false, true, true, true, true);

-- name: calendar_tolerance_component_overflow
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, '2000-02-29'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '2147483647 months'::interval, '1 month'::interval, false, true, true, true, true);

-- name: calendar_tolerance_skipped_error
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, true, '400000-01-01'::date, '2000-01-31'::date, '2000-02-29 12:00'::timestamp, '2000-01-31 12:00'::timestamp, '60 days'::interval, '1 month'::interval, '-infinity'::interval, false, true, true, true, true);

-- name: calendar_tolerance_null
INSERT INTO calendar_tolerances (id, template_id, skip_validation, candidate_day, base_day, candidate_at, base_at, candidate_duration, base_duration, tolerance, subtract_offset, compare_less, recorded_day, recorded_at, recorded_duration) VALUES (2, 1, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: zone_fixed_hour
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 hour'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_negative
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '-05:30'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 18:04:56.123456+00', '2000-01-01 07:04:56.123456', '05:04:56.123456-05:30', '-19800', timezone('-05:30'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_fraction
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '0.999999 seconds'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 12:34:56.123456+00', '2000-01-01 12:34:56.123456', '10:34:56.123456+00', '0', timezone('0.999999 seconds'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_outside_text_range
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '16 hours'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '1999-12-31 20:34:56.123456+00', '2000-01-02 04:34:56.123456', '02:34:56.123456+16', '57600', timezone('16 hours'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_wide
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '100 hours'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '1999-12-28 08:34:56.123456+00', '2000-01-05 16:34:56.123456', '14:34:56.123456+100', '360000', timezone('100 hours'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_int32_min
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '2147483648 seconds'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2068-01-19 15:49:04.123456+00', '2068-01-19 15:49:04.123456', '13:49:04.123456+4294370773:4294967282:4294967288', '-2147483648', timezone('2147483648 seconds'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_int32_min_negative
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '-2147483648 seconds'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2068-01-19 15:49:04.123456+00', '2068-01-19 15:49:04.123456', '13:49:04.123456+4294370773:4294967282:4294967288', '-2147483648', timezone('-2147483648 seconds'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_wrapped
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '4294967296 seconds'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 12:34:56.123456+00', '2000-01-01 12:34:56.123456', '10:34:56.123456+00', '0', timezone('4294967296 seconds'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_maximum_interval
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '9223372036854.775807 seconds'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '1934-03-06 06:02:34.123456+00', '2065-10-28 19:07:18.123456', '17:07:18.123456+577014:32:22', '2077252342', timezone('9223372036854.775807 seconds'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_wrong_recorded_instant
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 hour'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 00:00+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_wrong_recorded_local
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 hour'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 00:00+00', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_wrong_recorded_clock
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 hour'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', '00:00+00');

-- name: zone_fixed_wrong_recorded_label
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 hour'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '00:00+00', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_wrong_recorded_offset
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 hour'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', 0, timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_invalid_1_day
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 day'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_invalid_1_month
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '1 month'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_invalid_infinity
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, 'infinity'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_timestamp_bounds
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, '-1 hour'::interval, '294276-12-31 23:59:59.999999'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_skipped_error
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, true, 'infinity'::interval, '2000-01-01 12:34:56.123456'::timestamp, '2000-01-01 12:34:56.123456+00'::timestamptz, '12:34:56.123456+02'::timetz, '2000-01-01 11:34:56.123456+00', '2000-01-01 13:34:56.123456', '11:34:56.123456+01', '3600', timezone('1 hour'::interval,'12:34:56.123456+02'::timetz));

-- name: zone_fixed_null
INSERT INTO fixed_zone_records (id, template_id, skip_validation, zone_offset, source_local, source_instant, source_clock, recorded_instant, recorded_local, recorded_label, recorded_offset, recorded_clock) VALUES (2, 1, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: duration_alternative_extended
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P0002-06-07T01:30:00','2 years 6 mons 7 days 01:30:00',false);

-- name: duration_alternative_basic
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P00020607T013000.5','2 years 6 mons 7 days 01:30:00',false);

-- name: duration_alternative_basic_time_fraction
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'PT010203.75','01:02:03.000001',false);

-- name: duration_alternative_negative
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P-00020607T-013000','-2 years -6 mons -7 days -01:30:00',false);

-- name: duration_alternative_mixed
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P1--2--3T4:-5:-6.5','10 mons -3 days +03:54:53.5',false);

-- name: duration_alternative_exponents
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P1e2-3e1-4e1T1e1:2e1:3e1','102 years 6 mons 40 days 10:20:30',false);

-- name: duration_alternative_invalid_designator
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P1Y2','0',false);

-- name: duration_alternative_skips_invalid_designator
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P1Y2','0',true);

-- name: duration_alternative_invalid_trailing
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P1-2-3T4:5:6S','0',false);

-- name: duration_alternative_skips_invalid_trailing
INSERT INTO duration_imports (id,template_id,raw_duration,expected_duration,skip_import) VALUES (2,1,'P1-2-3T4:5:6S','0',true);

-- name: zoned_calendar_month_clip
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', '1 month', 'UTC', '2000-02-29 12:00+00', '1999-12-31 12:00+00', '2000-01-29 12:00+00', false);
-- name: zoned_calendar_fall_day
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2024-11-02 05:30+00', '1 day', 'America/New_York', '2024-11-03 06:30+00', '2024-11-01 05:30+00', '2024-11-02 05:30+00', false);
-- name: zoned_calendar_fall_hours
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2024-11-02 05:30+00', '24 hours', 'America/New_York', '2024-11-03 05:30+00', '2024-11-01 05:30+00', '2024-11-02 05:30+00', false);
-- name: zoned_calendar_month_gap_then_day
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2024-02-10 07:30+00', '1 month 1 day', 'America/New_York', '2024-03-11 07:30+00', '2024-01-09 07:30+00', '2024-02-10 08:30+00', false);
-- name: zoned_calendar_skipped_day
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2011-11-30 10:30+00', '1 month 1 day', 'Pacific/Apia', '2011-12-31 10:30+00', '2011-10-29 10:30+00', '2011-11-30 10:30+00', false);
-- name: zoned_calendar_wrong_addition
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', '1 month', 'UTC', '2000-02-28 12:00+00', '1999-12-31 12:00+00', '2000-01-29 12:00+00', false);
-- name: zoned_calendar_wrong_subtraction
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', '1 month', 'UTC', '2000-02-29 12:00+00', '1999-12-30 12:00+00', '2000-01-29 12:00+00', false);
-- name: zoned_calendar_noninvertible_month
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', '1 month', 'UTC', '2000-02-29 12:00+00', '1999-12-31 12:00+00', '2000-01-31 12:00+00', false);
-- name: zoned_calendar_positive_infinity
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, 'infinity', '1 month', 'Europe/Berlin', 'infinity', 'infinity', 'infinity', false);
-- name: zoned_calendar_negative_infinity
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '-infinity', '-1 month', 'Europe/Berlin', '-infinity', '-infinity', '-infinity', false);
-- name: zoned_calendar_null_span
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', NULL, 'UTC', NULL, NULL, NULL, false);
-- name: zoned_calendar_infinite_span_error
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', 'infinity', 'UTC', 'infinity', '-infinity', 'infinity', false);
-- name: zoned_calendar_month_overflow
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, '2000-01-31 12:00+00', '2147483647 months', 'UTC', 'infinity', '-infinity', 'infinity', false);
-- name: zoned_calendar_negation_overflow
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, 'infinity', '-2147483648 months', 'UTC', 'infinity', 'infinity', 'infinity', false);
-- name: zoned_calendar_invalid_zone_before_infinity
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, 'infinity', '0', 'UTC+168', 'infinity', 'infinity', 'infinity', false);
-- name: zoned_calendar_null_span_skips_zone_lookup
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, 'infinity', NULL, 'UTC+168', 'infinity', 'infinity', 'infinity', false);
-- name: zoned_calendar_skip_invalid_zone
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, 'infinity', '0', 'UTC+168', 'infinity', 'infinity', 'infinity', true);
-- name: zoned_calendar_skip_invalid_span
INSERT INTO zoned_calendar_adjustments (id, template_id, source_instant, calendar_span, zone_name, recorded_addition, recorded_subtraction, recorded_return, skip_validation)
VALUES (2, 1, 'infinity', '-2147483648 months', 'UTC', 'infinity', 'infinity', 'infinity', true);

-- name: local_conflict_intersection
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours','10:00','13:00','3 hours',true,true,true,true,false);
-- name: local_conflict_wrong_endpoints
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours','10:00','13:00','3 hours',false,true,true,true,false);
-- name: local_conflict_wrong_first_duration
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours','10:00','13:00','3 hours',true,false,true,true,false);
-- name: local_conflict_wrong_second_duration
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours','10:00','13:00','3 hours',true,true,false,true,false);
-- name: local_conflict_wrong_both_durations
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours','10:00','13:00','3 hours',true,true,true,false,false);
-- name: local_conflict_touching_boundary
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','10:00','1 hour','10:00','11:00','1 hour',false,false,false,false,false);
-- name: local_conflict_reversed_periods
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'12:00','09:00','-3 hours','13:00','10:00','-3 hours',true,true,true,true,false);
-- name: local_conflict_equal_points
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'10:00','10:00','0','10:00','10:00','0',true,true,true,true,false);
-- name: local_conflict_distinct_midnight_markers
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'24:00','24:00','0','00:00','00:00','0',false,true,false,true,false);
-- name: local_conflict_wrapped_duration
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'23:00','01:00','2 hours','12:00','13:00','1 hour',true,true,true,true,false);
-- name: local_conflict_known_intersection_with_null_end
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'10:00',NULL,'1 hour','09:00','11:00','2 hours',true,true,true,true,false);
-- name: local_conflict_indeterminate_null_end
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00',NULL,'2 hours','10:00','12:00','2 hours',false,true,false,true,false);
-- name: local_conflict_known_intersection_with_null_start
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours',NULL,'11:00','2 hours',true,true,NULL,NULL,false);
-- name: local_conflict_calendar_fields_ignored
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','10:00','1 month 1 hour','09:30','10:30','-2 days 1 hour',true,true,true,true,false);
-- name: local_conflict_lazy_validation
INSERT INTO local_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'09:00','12:00','3 hours','10:00','13:00','3 hours',false,false,false,false,true);

-- name: calendar_conflict_intersection
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00','2024-02-28 12:00','3 hours','2024-02-28 10:00','2024-02-28 13:00','3 hours',true,true,true,true,false);
-- name: calendar_conflict_wrong_endpoints
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00','2024-02-28 12:00','3 hours','2024-02-28 10:00','2024-02-28 13:00','3 hours',false,true,true,true,false);
-- name: calendar_conflict_wrong_first_duration
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00','2024-02-28 12:00','3 hours','2024-02-28 10:00','2024-02-28 13:00','3 hours',true,false,true,true,false);
-- name: calendar_conflict_wrong_second_duration
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00','2024-02-28 12:00','3 hours','2024-02-28 10:00','2024-02-28 13:00','3 hours',true,true,false,true,false);
-- name: calendar_conflict_wrong_both_durations
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00','2024-02-28 12:00','3 hours','2024-02-28 10:00','2024-02-28 13:00','3 hours',true,true,true,false,false);
-- name: calendar_conflict_touching_boundary
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00','2024-02-28 10:00','1 hour','2024-02-28 10:00','2024-02-28 11:00','1 hour',false,false,false,false,false);
-- name: calendar_conflict_reversed_periods
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 12:00','2024-02-28 09:00','-3 hours','2024-02-28 13:00','2024-02-28 10:00','-3 hours',true,true,true,true,false);
-- name: calendar_conflict_month_clipping
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-01-31 09:00','2024-02-29 09:00','1 month','2024-02-28 09:00','2024-03-01 09:00','2 days',true,true,true,true,false);
-- name: calendar_conflict_same_infinite_points
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'infinity','infinity','0','infinity','infinity','0',true,true,true,true,false);
-- name: calendar_conflict_opposite_infinite_points
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'-infinity','-infinity','0','infinity','infinity','0',false,false,false,false,false);
-- name: calendar_conflict_known_intersection_with_null_end
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 10:00',NULL,'1 hour','2024-02-28 09:00','2024-02-28 11:00','2 hours',true,true,true,true,false);
-- name: calendar_conflict_indeterminate_null_end
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'2024-02-28 09:00',NULL,'2 hours','2024-02-28 10:00','2024-02-28 12:00','2 hours',false,true,false,true,false);
-- name: calendar_conflict_duration_overflow
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'294276-12-31 23:59:59','294276-12-31 23:59:59','1 day','2000-01-01','2000-01-02','1 day',false,false,false,false,false);
-- name: calendar_conflict_infinite_duration_error
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'infinity','infinity','-infinity','2000-01-01','2000-01-02','1 day',false,false,false,false,false);
-- name: calendar_conflict_lazy_overflow
INSERT INTO calendar_shift_conflicts (id,template_id,first_starts_at,first_ends_at,first_duration,second_starts_at,second_ends_at,second_duration,endpoint_overlap,first_duration_overlap,second_duration_overlap,both_duration_overlap,skip_validation)
VALUES (2,1,'294276-12-31 23:59:59','294276-12-31 23:59:59','1 day','2000-01-01','2000-01-02','1 day',false,false,false,false,true);

-- name: zoned_conflict_intersection
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'09:00+00','12:00+00','12:00+02','15:00+02',true,false);
-- name: zoned_conflict_wrong_result
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'09:00+00','12:00+00','12:00+02','15:00+02',false,false);
-- name: zoned_conflict_touching_boundary
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'09:00+00','10:00+00','10:00+00','11:00+00',false,false);
-- name: zoned_conflict_equal_utc_with_offset_tie
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'12:00+02','12:00+02','11:00+01','11:00+01',false,false);
-- name: zoned_conflict_equal_points
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'12:00+02','12:00+02','12:00+02','12:00+02',true,false);
-- name: zoned_conflict_known_intersection_with_null_end
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'10:00+00',NULL,'09:00+00','11:00+00',true,false);
-- name: zoned_conflict_indeterminate_null_end
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'09:00+00',NULL,'10:00+00','12:00+00',false,false);
-- name: zoned_conflict_wide_offsets
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,timezone('2147483648 seconds'::interval,'09:00+00'::timetz),timezone('2147483648 seconds'::interval,'12:00+00'::timetz),timezone('2147483648 seconds'::interval,'10:00+00'::timetz),timezone('2147483648 seconds'::interval,'13:00+00'::timetz),true,false);
-- name: zoned_conflict_lazy_validation
INSERT INTO zoned_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'09:00+00','12:00+00','12:00+02','15:00+02',false,true);

-- name: instant_conflict_intersection
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2024-03-10 01:00-05','2024-03-10 04:00-04','2024-03-10 07:00+00','2024-03-10 09:00+00',true,false);
-- name: instant_conflict_wrong_result
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2024-03-10 01:00-05','2024-03-10 04:00-04','2024-03-10 07:00+00','2024-03-10 09:00+00',false,false);
-- name: instant_conflict_touching_boundary
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2024-03-10 01:00-05','2024-03-10 04:00-04','2024-03-10 08:00+00','2024-03-10 09:00+00',false,false);
-- name: instant_conflict_equal_instants
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2024-11-03 01:30-04','2024-11-03 01:30-04','2024-11-03 05:30+00','2024-11-03 05:30+00',true,false);
-- name: instant_conflict_infinite_span
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'infinity','-infinity','2000-01-01+00','2000-01-02+00',true,false);
-- name: instant_conflict_same_infinite_points
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'infinity','infinity','infinity','infinity',true,false);
-- name: instant_conflict_known_intersection_with_null_end
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2000-01-01 10:00+00',NULL,'2000-01-01 09:00+00','2000-01-01 11:00+00',true,false);
-- name: instant_conflict_indeterminate_null_end
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2000-01-01 09:00+00',NULL,'2000-01-01 10:00+00','2000-01-01 12:00+00',false,false);
-- name: instant_conflict_lazy_validation
INSERT INTO instant_shift_conflicts (id,template_id,first_starts_at,first_ends_at,second_starts_at,second_ends_at,recorded_overlap,skip_validation)
VALUES (2,1,'2024-03-10 01:00-05','2024-03-10 04:00-04','2024-03-10 07:00+00','2024-03-10 09:00+00',false,true);

-- name: calendar_field_fractional_seconds
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01 12:34:12.5','seconds',12.5,'\x4029000000000000',false);
-- name: calendar_field_wrong_value
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01 12:34:12.5','seconds',12.25,'\x4029000000000000',false);
-- name: calendar_field_wrong_wire
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01 12:34:12.5','seconds',12.5,'\x4028800000000000',false);
-- name: calendar_field_epoch_zero
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'1970-01-01','epoch',0,'\x0000000000000000',false);
-- name: calendar_field_negative_epoch_fraction
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'1969-12-31 23:59:59.999999','epoch',-0.000001,'\xbeb0c6f7a0b5ed8d',false);
-- name: calendar_field_fractional_julian_day
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01 12:00','julian',2451545.5,'\x4142b42cc0000000',false);
-- name: calendar_field_bc_year
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'0001-01-01 BC','year',-1,'\xbff0000000000000',false);
-- name: calendar_field_infinite_year
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'infinity','year','Infinity','\x7ff0000000000000',false);
-- name: calendar_field_negative_infinite_year
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'-infinity','year','-Infinity','\xfff0000000000000',false);
-- name: calendar_field_infinite_seconds_null
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'infinity','seconds',NULL,NULL,false);
-- name: calendar_field_wrong_infinite_seconds
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'infinity','seconds',1,NULL,false);
-- name: calendar_field_unsupported_unit
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01','timezone',0,'\x0000000000000000',false);
-- name: calendar_field_unrecognized_unit
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01','bogus',0,'\x0000000000000000',false);
-- name: calendar_field_lazy_unknown_unit
INSERT INTO calendar_field_records (id,template_id,source_local,field_name,recorded_value,recorded_wire,skip_validation)
VALUES (2,1,'2000-01-01','bogus',0,'\x0000000000000000',true);
