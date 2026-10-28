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

-- name: calendar_compact_epoch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '20000101', '2000-01-01', false);
-- name: calendar_compact_short_year
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '690101', '2069-01-01', false);
-- name: calendar_compact_short_year_mismatch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '700101', '2070-01-01', false);
-- name: calendar_compact_bc_year
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '690101 BC', '0069-01-01 BC', false);
-- name: calendar_compact_zero_year
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '00000101', NULL, false);
-- name: calendar_compact_skipped_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '19000229', NULL, true);
-- name: local_compact_clock_carry
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20000101 250000', '2000-01-02 01:00:00', false);
-- name: local_compact_clock_carry_mismatch
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20000101 250000', '2000-01-01 01:00:00', false);
-- name: local_compact_clock_fraction
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20000101 1234.5Z', '2000-01-01 12:34:00.5', false);
-- name: local_compact_lower_boundary_carry
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '47141121 720000Z BC', '4714-11-24 00:00:00 BC', false);
-- name: local_compact_zone_error_before_calendar
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20001301 999999+16', NULL, false);
-- name: instant_compact_clock_carry
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20000101 999999Z', '2000-01-05 04:40:39+00', false);
-- name: instant_compact_fraction_tie
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20000101 123456.0000015Z', '2000-01-01 12:34:56.000002+00', false);
-- name: instant_compact_upper_boundary_offset
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2942761231 240000+00:00:01', '294276-12-31 23:59:59+00', false);
-- name: instant_compact_lower_boundary_offset_error
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '47141120 999999+15:59:59 BC', NULL, false);
-- name: instant_compact_skipped_error
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '20001301 999999+16', NULL, true);

-- name: calendar_ordinal_leap_day
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000.060', '2000-02-29', false);
-- name: calendar_ordinal_space_separated
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000 060', '2000-02-29', false);
-- name: calendar_ordinal_year_rollover
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2001-366', '2002-01-01', false);
-- name: calendar_ordinal_rollover_mismatch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2001-366', '2001-12-31', false);
-- name: calendar_ordinal_bc_rollover
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '0002-366 BC', '0001-01-01 BC', false);
-- name: calendar_ordinal_wrapped_bc_day
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '4801-001 BC', '4560-06-19 BC', false);
-- name: calendar_ordinal_lower_boundary_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '4714-327 BC', NULL, false);
-- name: calendar_ordinal_missing_day_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-01', NULL, false);
-- name: calendar_ordinal_skipped_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-367', NULL, true);
-- name: local_ordinal_clock
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-060T12:00:00Z', '2000-02-29 12:00:00', false);
-- name: local_ordinal_compact_carry
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '4714-324 999999Z BC', '4714-11-24 04:40:39 BC', false);
-- name: local_ordinal_zero_year_zone_error
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '0000-366 000000+16', NULL, false);
-- name: local_ordinal_upper_offset_error
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '294276-366 240000+00:00:01', NULL, false);
-- name: instant_ordinal_offset
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000 060 12:00 -05', '2000-02-29 17:00:00+00', false);
-- name: instant_ordinal_upper_boundary_offset
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '294276-366 240000+00:00:01', '294276-12-31 23:59:59+00', false);
-- name: instant_ordinal_lexical_error_before_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-367 000000+16', NULL, false);
-- name: instant_ordinal_skipped_error
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-000 000000Z', NULL, true);

-- name: calendar_clock_ignored
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-01-01 23:59:59.999999-15', '2000-01-01', false);
-- name: calendar_compact_clock_carry_ignored
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '20000101 999999', '2000-01-01', false);
-- name: calendar_clock_carry_mismatch
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '1999-12-31 24:00:00', '2000-01-01', false);
-- name: calendar_clock_field_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-01-01 25:00', NULL, false);
-- name: calendar_clock_zone_error_before_calendar
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-13-01 00:00+16', NULL, false);
-- name: calendar_clock_skipped_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-01-01 12:60', NULL, true);

-- name: calendar_attached_zone
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '20000101+05', '2000-01-01', false);
-- name: calendar_attached_zone_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-13-01+16', NULL, false);
-- name: local_attached_zone_ignored
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-060+05', '2000-02-29 00:00:00', false);
-- name: instant_attached_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000-01-01+05:30:15', '1999-12-31 18:29:45+00', false);
-- name: instant_attached_zone_range_error
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '4714-11-24+01 BC', NULL, false);
-- name: instant_ordinal_minus_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000/060-05', '2000-02-29 05:00:00+00', false);
-- name: calendar_ordinal_minus_zone_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000.060-16', NULL, false);
-- name: calendar_wide_fields
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000/0002/0029', '2000-02-29', false);
-- name: calendar_three_digit_year
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '200.03.01', '0200-03-01', false);
-- name: calendar_missing_final_day_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000-01- BC', NULL, false);
-- name: calendar_space_month_error
INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import) VALUES (2, '2000 13', NULL, false);
-- name: local_wide_fields_clock
INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '1999/12/31 23:59:59.999999-15', '1999-12-31 23:59:59.999999', false);
-- name: instant_wide_fields_zone
INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import) VALUES (2, 1, '2000.01.01 12:00+05', '2000-01-01 07:00:00+00', false);
