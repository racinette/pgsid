INSERT INTO flight_arrivals (id, arrival_zone, local_arrival, arrival_at)
VALUES (1, 'Etc/UTC', '2026-01-01 12:00:00', '2026-01-01 12:00:00+00');

INSERT INTO arrival_displays (id, display_zone, arrival_at, local_display)
VALUES (1, 'Etc/UTC', '2026-01-01 12:00:00+00', '2026-01-01 12:00:00');

INSERT INTO flight_date_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (1, false, '2000-01-01', '2000-01-01', 0, 0, '2000-01-01', '2000-01-01', true, -272711505, 4154612158245552303);

INSERT INTO flight_timestamp_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (1, false, '2000-01-01', '2000-01-01', 0, 0, '2000-01-01', '2000-01-01', true, -272711505, 4154612158245552303);

INSERT INTO flight_instant_order (id, skip, left_value, right_value, hash_seed, comparison_record, larger_record, smaller_record, finite_record, hash_record, seeded_hash_record)
VALUES (1, false, '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', 0, 0, '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', true, -272711505, 4154612158245552303);

INSERT INTO flight_mixed_order (id, skip, calendar_value, local_value, comparison_record, reverse_comparison_record, equal_record, unequal_record, less_record, less_equal_record, greater_record, greater_equal_record)
VALUES (1, false, '2000-01-01', '2000-01-01', 0, 0, true, false, false, true, false, true);

INSERT INTO flight_calendar_shift (id, skip, calendar_value, other_calendar, days, local_value, difference_record, plus_record, minus_record, swapped_plus_record, timestamp_record, date_record)
VALUES (1, false, '2000-01-01', '2000-01-01', 0, '2000-01-01', 0, '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01', '2000-01-01');

INSERT INTO flight_precision (id, skip, local_value, instant_value, precision, local_record, instant_record)
VALUES (1, false, '2000-01-01 00:00:00.500000', '2000-01-01 00:00:00.500000+00', 0, '2000-01-01 00:00:01', '2000-01-01 00:00:01+00');
