-- name: new_york_winter_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-01-15 12:00:00', '2050-01-15 17:00:00+00');

-- name: arrival_zone_offset_out_of_range
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'UTC168', '2050-01-15 12:00:00', '2050-01-15 17:00:00+00');

-- name: display_zone_minutes_out_of_range
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'GMT8:70', '2050-01-15 17:00:00+00', '2050-01-15 12:00:00');

-- name: null_arrival_skips_invalid_zone
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'UTC168', NULL, NULL);

-- name: null_display_skips_invalid_zone
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'GMT8:70', NULL, NULL);

-- name: infinite_arrival_skips_invalid_zone
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'UTC168', 'infinity', 'infinity');

-- name: infinite_display_skips_invalid_zone
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'GMT8:70', '-infinity', '-infinity');

-- name: new_york_summer_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-07-15 12:00:00', '2050-07-15 16:00:00+00');

-- name: new_york_summer_wrong_offset
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-07-15 12:00:00', '2050-07-15 17:00:00+00');

-- name: spring_gap_before_offset
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-03-13 02:30:00', '2050-03-13 07:30:00+00');

-- name: spring_gap_after_offset
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-03-13 02:30:00', '2050-03-13 06:30:00+00');

-- name: autumn_overlap_after_offset
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-11-06 01:30:00', '2050-11-06 06:30:00+00');

-- name: autumn_overlap_before_offset
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-11-06 01:30:00', '2050-11-06 05:30:00+00');

-- name: spring_last_microsecond
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-03-13 01:59:59.999999', '2050-03-13 06:59:59.999999+00');

-- name: spring_first_valid_clock
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-03-13 03:00:00', '2050-03-13 07:00:00+00');

-- name: spring_wrong_microsecond
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-03-13 03:00:00', '2050-03-13 07:00:00.000001+00');

-- name: lord_howe_half_hour_gap
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Australia/Lord_Howe', '2050-10-02 02:15:00', '2050-10-01 15:45:00+00');

-- name: lord_howe_half_hour_overlap
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Australia/Lord_Howe', '2050-04-03 01:45:00', '2050-04-02 15:15:00+00');

-- name: dublin_negative_dst_winter
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Europe/Dublin', '2050-01-15 12:00:00', '2050-01-15 12:00:00+00');

-- name: dublin_negative_dst_summer
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Europe/Dublin', '2050-07-15 12:00:00', '2050-07-15 11:00:00+00');

-- name: apia_skipped_calendar_day
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Pacific/Apia', '2011-12-30 12:00:00', '2011-12-30 22:00:00+00');

-- name: kathmandu_quarter_hour_offset
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Asia/Kathmandu', '2050-01-15 12:00:00', '2050-01-15 06:15:00+00');

-- name: paris_historical_seconds
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'Europe/Paris', '1890-01-01 12:00:00', '1890-01-01 11:50:39+00');

-- name: case_insensitive_zone_alias
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'uS/eAsTeRn', '2050-07-15 12:00:00', '2050-07-15 16:00:00+00');

-- name: distant_future_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '10000-07-15 12:00:00', '10000-07-15 16:00:00+00');

-- name: fixed_posix_offset_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'UTC+02:30', '2050-07-15 12:00:00', '2050-07-15 14:30:00+00');

-- name: null_local_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', NULL, '2050-07-15 16:00:00+00');

-- name: null_instant_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', '2050-07-15 12:00:00', NULL);

-- name: infinite_arrival
INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (2, 'America/New_York', 'infinity', 'infinity');

-- name: spring_display_before_boundary
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-03-13 06:59:59.999999+00', '2050-03-13 01:59:59.999999');

-- name: spring_display_at_boundary
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-03-13 07:00:00+00', '2050-03-13 03:00:00');

-- name: spring_display_in_gap
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-03-13 07:30:00+00', '2050-03-13 02:30:00');

-- name: overlap_first_instant_display
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-11-06 05:30:00+00', '2050-11-06 01:30:00');

-- name: overlap_second_instant_display
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-11-06 06:30:00+00', '2050-11-06 01:30:00');

-- name: overlap_second_instant_wrong_display
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-11-06 06:30:00+00', '2050-11-06 02:30:00');

-- name: historical_display_seconds
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'Europe/Paris', '1890-01-01 11:50:39+00', '1890-01-01 12:00:00');

-- name: null_arrival_display
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', NULL, '2050-07-15 12:00:00');

-- name: null_local_display
INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (2, 'America/New_York', '2050-07-15 16:00:00+00', NULL);

-- name: matching_date_records
INSERT INTO flight_date_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, 0, '2000-01-01', '2000-01-01', true, -272711505, 4154612158245552303);

-- name: incorrect_date_records
INSERT INTO flight_date_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, 1, '2000-01-02', '2000-01-02', false, 0, 0);

-- name: null_date_order_inputs
INSERT INTO flight_date_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, NULL, NULL, 0, 0, '2000-01-01', '2000-01-01', true, -272711505, 4154612158245552303);

-- name: infinite_date_order
INSERT INTO flight_date_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, 'infinity', '2000-01-01', 0, 1, 'infinity', '2000-01-01', false, NULL, NULL);

-- name: earliest_date_order
INSERT INTO flight_date_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '4714-11-24 BC', '2000-01-01', 0, -1, '2000-01-01', '4714-11-24 BC', true, NULL, NULL);

-- name: matching_timestamp_records
INSERT INTO flight_timestamp_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, 0, '2000-01-01', '2000-01-01', true, -272711505, 4154612158245552303);

-- name: incorrect_timestamp_records
INSERT INTO flight_timestamp_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, 1, '2000-01-02', '2000-01-02', false, 0, 0);

-- name: null_timestamp_order_inputs
INSERT INTO flight_timestamp_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, NULL, NULL, 0, 0, '2000-01-01', '2000-01-01', true, -272711505, 4154612158245552303);

-- name: negative_infinite_timestamp_order
INSERT INTO flight_timestamp_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '-infinity', '2000-01-01', 0, -1, '2000-01-01', '-infinity', false, NULL, NULL);

-- name: signed_timestamp_microsecond_order
INSERT INTO flight_timestamp_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '1999-12-31 23:59:59.999999', '2000-01-01 00:00:00.000001', 0, -1, '2000-01-01 00:00:00.000001', '1999-12-31 23:59:59.999999', true, NULL, NULL);

-- name: matching_instant_records
INSERT INTO flight_instant_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', 0, 0, '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', true, -272711505, 4154612158245552303);

-- name: incorrect_instant_records
INSERT INTO flight_instant_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', 0, 1, '2000-01-02 00:00:00+00', '2000-01-02 00:00:00+00', false, 0, 0);

-- name: null_instant_order_inputs
INSERT INTO flight_instant_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, NULL, NULL, 0, 0, '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', true, -272711505, 4154612158245552303);

-- name: infinite_instant_order
INSERT INTO flight_instant_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (2, false, 'infinity', '-infinity', -9223372036854775808, 1, 'infinity', '-infinity', false, NULL, NULL);

-- name: matching_mixed_temporal_records
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, 0, true, false, false, true, false, true);

-- name: incorrect_mixed_temporal_records
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 1, 1, false, true, true, false, true, false);

-- name: null_mixed_temporal_input
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, NULL, '2000-01-01', 0, 0, true, false, false, true, false, true);

-- name: midnight_precedes_timestamp_microsecond
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, '2000-01-01', '2000-01-01 00:00:00.000001', -1, 1, false, true, true, true, false, false);

-- name: distant_finite_date_precedes_infinite_timestamp
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, '5000000-01-01', 'infinity', -1, 1, false, true, true, true, false, false);

-- name: distant_finite_date_exceeds_finite_timestamp
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, '5000000-01-01', '294276-12-31 23:59:59.999999', 1, -1, false, true, false, false, true, true);

-- name: equal_negative_temporal_infinities
INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (2, false, '-infinity', '-infinity', 0, 0, true, false, false, true, false, true);

-- name: matching_calendar_shift_records
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, '2000-01-01', 0, '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01');

-- name: incorrect_calendar_shift_records
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 0, '2000-01-01', 1, '2000-01-02', '2000-01-02', '2000-01-02', '2000-01-02', '2000-01-02');

-- name: null_calendar_shift_inputs
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, NULL, NULL, NULL, NULL, 0, '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01');

-- name: leap_day_calendar_shift
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, '2000-02-28', '2000-02-27', 1, '2000-02-28 23:59:59.999999', 1, '2000-02-29', '2000-02-27', '2000-02-29', '2000-02-28', '2000-02-28');

-- name: calendar_difference_rejects_infinity
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, 'infinity', '2000-01-01', 0, '2000-01-01', 0, 'infinity', 'infinity', 'infinity', 'infinity', '2000-01-01');

-- name: calendar_addition_rejects_overflow
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, '2000-01-01', '2000-01-01', 2147483647, '2000-01-01', 0, NULL, NULL, NULL, '2000-01-01', '2000-01-01');

-- name: calendar_subtraction_rejects_underflow
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, '4714-11-24 BC', '4714-11-24 BC', 1, '2000-01-01', 0, NULL, NULL, NULL, '4714-11-24 BC', '2000-01-01');

-- name: calendar_timestamp_cast_rejects_large_date
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, false, '5000000-01-01', '5000000-01-01', 0, '2000-01-01', 0, '5000000-01-01', '5000000-01-01', '5000000-01-01', NULL, '2000-01-01');

-- name: calendar_timestamp_cast_is_lazy
INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (2, true, '5000000-01-01', '5000000-01-01', 2147483647, '2000-01-01', 0, NULL, NULL, NULL, NULL, NULL);

-- name: matching_precision_records
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '2000-01-01 00:00:00.500000', '2000-01-01 00:00:00.500000+00', 0, '2000-01-01 00:00:01', '2000-01-01 00:00:01+00');

-- name: incorrect_precision_records
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '2000-01-01 00:00:00.500000', '2000-01-01 00:00:00.500000+00', 0, '2000-01-01', '2000-01-01 00:00:00+00');

-- name: null_precision_inputs
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, NULL, NULL, 0, '2000-01-01', '2000-01-01 00:00:00+00');

-- name: null_precision_modifier
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '2000-01-01', '2000-01-01 00:00:00+00', NULL, '2000-01-01', '2000-01-01 00:00:00+00');

-- name: negative_precision_half_rounds_away_from_epoch
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '1999-12-31 23:59:59.500000', '1999-12-31 23:59:59.500000+00', 0, '1999-12-31 23:59:59', '1999-12-31 23:59:59+00');

-- name: six_digits_preserve_timestamp_fraction
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '2000-01-01 00:00:00.000001', '2000-01-01 00:00:00.000001+00', 6, '2000-01-01 00:00:00.000001', '2000-01-01 00:00:00.000001+00');

-- name: negative_one_precision_is_identity
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '2000-01-01 00:00:00.000001', '2000-01-01 00:00:00.000001+00', -1, '2000-01-01 00:00:00.000001', '2000-01-01 00:00:00.000001+00');

-- name: invalid_timestamp_precision
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '2000-01-01', '2000-01-01 00:00:00+00', 7, NULL, NULL);

-- name: timestamp_infinities_ignore_invalid_precision
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, 'infinity', '-infinity', 7, 'infinity', '-infinity');

-- name: timestamp_precision_is_lazy
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, true, '2000-01-01', '2000-01-01 00:00:00+00', 2147483647, NULL, NULL);

-- name: precision_rounding_crosses_timestamp_boundary
INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (2, false, '294276-12-31 23:59:59.999999', '294276-12-31 23:59:59.999999+00', 0, '294276-12-31 23:59:59.999999', '294276-12-31 23:59:59.999999+00');
