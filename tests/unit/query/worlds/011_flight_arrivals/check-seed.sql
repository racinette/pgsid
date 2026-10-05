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
