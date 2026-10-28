-- name: calendar_epoch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'epoch', '1970-01-01', false);
-- name: calendar_epoch_padded_case
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, ' EPOCH ', '1970-01-01', false);
-- name: calendar_epoch_ignores_bc_suffix
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'epoch BC', '1970-01-01', false);
-- name: calendar_epoch_wrong_expected_day
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'epoch', '1970-01-02', false);
-- name: calendar_null_input_and_expected
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, NULL, NULL, false);
-- name: calendar_null_input_with_expected
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, NULL, '1970-01-01', false);
-- name: calendar_invalid_day_reached
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-02-30', NULL, false);
-- name: calendar_invalid_day_skipped
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-02-30', NULL, true);

-- name: local_clock_epoch
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, 'epoch', '1970-01-01 00:00:00', false);
-- name: local_clock_epoch_ad
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, 'epoch AD', '1970-01-01 00:00:00', false);
-- name: local_clock_half_microsecond_even
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000005', '2000-01-01 00:00:00', false);
-- name: local_clock_half_microsecond_odd
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000015', '2000-01-01 00:00:00.000002', false);
-- name: local_clock_long_fraction_binary_tie
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000025000000000000001', '2000-01-01 00:00:00.000002', false);
-- name: local_clock_fraction_carries_day
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 23:59:59.9999999', '2000-01-02 00:00:00', false);
-- name: local_clock_fraction_carries_from_before_epoch
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '1999-12-31 23:59:59.9999995', '2000-01-01 00:00:00', false);
-- name: local_clock_midnight_fraction_rounds_zero
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 24:00:00.0000005', '2000-01-02 00:00:00', false);
-- name: local_clock_half_microsecond_wrong_rounding
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000005', '2000-01-01 00:00:00.000001', false);
-- name: local_clock_midnight_fraction_overflow_reached
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 24:00:00.0000006', NULL, false);
-- name: local_clock_midnight_fraction_overflow_skipped
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 24:00:00.0000006', NULL, true);
-- name: local_clock_range_carry_overflow_reached
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '294276-12-31 23:59:59.9999999', NULL, false);
-- name: local_clock_range_carry_overflow_skipped
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '294276-12-31 23:59:59.9999999', NULL, true);
-- name: local_clock_null_input_and_expected
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, NULL, NULL, false);
-- name: local_clock_null_input_with_expected
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, NULL, '1970-01-01 00:00:00', false);

-- name: instant_epoch
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, 'epoch', '1970-01-01 00:00:00+00', false);
-- name: instant_epoch_ad
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, 'epoch AD', '1970-01-01 00:00:00+00', false);
-- name: instant_half_microsecond_even
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000005+00', '2000-01-01 00:00:00+00', false);
-- name: instant_half_microsecond_odd
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000015+00', '2000-01-01 00:00:00.000002+00', false);
-- name: instant_long_fraction_binary_tie
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000025000000000000001+00', '2000-01-01 00:00:00.000002+00', false);
-- name: instant_fraction_carries_day
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 23:59:59.9999999+00', '2000-01-02 00:00:00+00', false);
-- name: instant_fraction_carries_from_before_epoch
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '1999-12-31 23:59:59.9999995+00', '2000-01-01 00:00:00+00', false);
-- name: instant_midnight_fraction_rounds_zero
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 24:00:00.0000005+00', '2000-01-02 00:00:00+00', false);
-- name: instant_half_microsecond_wrong_rounding
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 00:00:00.0000005+00', '2000-01-01 00:00:00.000001+00', false);
-- name: instant_midnight_fraction_overflow_reached
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 24:00:00.0000006+00', NULL, false);
-- name: instant_midnight_fraction_overflow_skipped
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 24:00:00.0000006+00', NULL, true);
-- name: instant_range_carry_overflow_reached
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '294276-12-31 23:59:59.9999999+00', NULL, false);
-- name: instant_range_carry_overflow_skipped
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '294276-12-31 23:59:59.9999999+00', NULL, true);
-- name: instant_null_input_and_expected
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, NULL, NULL, false);
-- name: instant_null_input_with_expected
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, NULL, '1970-01-01 00:00:00+00', false);

-- name: instant_fraction_with_offset
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 01:00:00.0000015+01', '2000-01-01 00:00:00.000002+00', false);
-- name: local_clock_fraction_ignores_offset
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01 01:00:00.0000015+01', '2000-01-01 01:00:00.000002', false);

-- name: instant_calendar_error_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2024-02-30', NULL, false);

-- name: instant_zero_year_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '0000-01-01', NULL, false);

-- name: instant_month_error_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2024-13-01', NULL, false);

-- name: instant_clock_calendar_error_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2024-02-30 00:00:00', NULL, false);

-- name: instant_clock_field_error_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2024-02-29 25:00:00', NULL, false);

-- name: instant_clock_midnight_error_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2024-02-29 24:00:00.000001', NULL, false);

-- name: instant_skipped_calendar_error_no_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2024-02-30', NULL, true);

-- name: calendar_julian_epoch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'J2451545', '2000-01-01', false);
-- name: calendar_julian_mismatch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'julian 2451544', '2000-01-01', false);
-- name: calendar_julian_zero
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'JD0', '4714-11-24 BC', false);
-- name: calendar_julian_era_is_not_reapplied
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'J2451545 BC', '2000-01-01', false);
-- name: calendar_julian_upper_bound
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'J2147483493', '5874897-12-31', false);
-- name: calendar_julian_range_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'J2147483494', NULL, false);
-- name: calendar_julian_integer_overflow
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'J2147483648', NULL, false);
-- name: calendar_julian_missing_number
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'julian', NULL, false);
-- name: calendar_julian_skipped_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, 'J2147483648', NULL, true);
