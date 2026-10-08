-- @world checks

CREATE TABLE flight_arrivals (
  id integer PRIMARY KEY,
  arrival_zone text NOT NULL,
  local_arrival timestamp,
  arrival_at timestamptz,
  CONSTRAINT arrival_interpretation
    CHECK (timezone(arrival_zone, local_arrival) = arrival_at)
);

CREATE TABLE arrival_displays (
  id integer PRIMARY KEY,
  display_zone text NOT NULL,
  arrival_at timestamptz,
  local_display timestamp,
  CONSTRAINT displayed_arrival
    CHECK (timezone(display_zone, arrival_at) = local_display)
);

CREATE TABLE flight_date_order (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  left_value date,
  right_value date,
  hash_seed bigint,
  comparison_record integer,
  larger_record date,
  smaller_record date,
  finite_record boolean,
  hash_record integer,
  seeded_hash_record bigint,
  CONSTRAINT flight_date_compare CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_cmp(left_value, right_value) = comparison_record END),
  CONSTRAINT flight_date_larger CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_larger(left_value, right_value) = larger_record END),
  CONSTRAINT flight_date_smaller CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_smaller(left_value, right_value) = smaller_record END),
  CONSTRAINT flight_date_finite CHECK (CASE WHEN skip THEN true ELSE pg_catalog.isfinite(left_value) = finite_record END),
  CONSTRAINT flight_date_hash CHECK (CASE WHEN skip THEN true ELSE pg_catalog.hashdate(left_value) = hash_record END),
  CONSTRAINT flight_date_seeded_hash CHECK (CASE WHEN skip THEN true ELSE pg_catalog.hashdateextended(left_value, hash_seed) = seeded_hash_record END)
);

CREATE TABLE flight_timestamp_order (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  left_value timestamp,
  right_value timestamp,
  hash_seed bigint,
  comparison_record integer,
  larger_record timestamp,
  smaller_record timestamp,
  finite_record boolean,
  hash_record integer,
  seeded_hash_record bigint,
  CONSTRAINT flight_timestamp_compare CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_cmp(left_value, right_value) = comparison_record END),
  CONSTRAINT flight_timestamp_larger CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_larger(left_value, right_value) = larger_record END),
  CONSTRAINT flight_timestamp_smaller CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_smaller(left_value, right_value) = smaller_record END),
  CONSTRAINT flight_timestamp_finite CHECK (CASE WHEN skip THEN true ELSE pg_catalog.isfinite(left_value) = finite_record END),
  CONSTRAINT flight_timestamp_hash CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_hash(left_value) = hash_record END),
  CONSTRAINT flight_timestamp_seeded_hash CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_hash_extended(left_value, hash_seed) = seeded_hash_record END)
);

CREATE TABLE flight_instant_order (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  left_value timestamptz,
  right_value timestamptz,
  hash_seed bigint,
  comparison_record integer,
  larger_record timestamptz,
  smaller_record timestamptz,
  finite_record boolean,
  hash_record integer,
  seeded_hash_record bigint,
  CONSTRAINT flight_instant_compare CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamptz_cmp(left_value, right_value) = comparison_record END),
  CONSTRAINT flight_instant_larger CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamptz_larger(left_value, right_value) = larger_record END),
  CONSTRAINT flight_instant_smaller CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamptz_smaller(left_value, right_value) = smaller_record END),
  CONSTRAINT flight_instant_finite CHECK (CASE WHEN skip THEN true ELSE pg_catalog.isfinite(left_value) = finite_record END),
  CONSTRAINT flight_instant_hash CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamptz_hash(left_value) = hash_record END),
  CONSTRAINT flight_instant_seeded_hash CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamptz_hash_extended(left_value, hash_seed) = seeded_hash_record END)
);

CREATE TABLE flight_mixed_order (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  calendar_value date,
  local_value timestamp,
  comparison_record integer,
  reverse_comparison_record integer,
  equal_record boolean,
  unequal_record boolean,
  less_record boolean,
  less_equal_record boolean,
  greater_record boolean,
  greater_equal_record boolean,
  CONSTRAINT flight_mixed_date_compare CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_cmp_timestamp(calendar_value, local_value) = comparison_record END),
  CONSTRAINT flight_mixed_timestamp_compare CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_cmp_date(local_value, calendar_value) = reverse_comparison_record END),
  CONSTRAINT flight_mixed_date_equal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_eq_timestamp(calendar_value, local_value) = equal_record END),
  CONSTRAINT flight_mixed_date_unequal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_ne_timestamp(calendar_value, local_value) = unequal_record END),
  CONSTRAINT flight_mixed_date_less CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_lt_timestamp(calendar_value, local_value) = less_record END),
  CONSTRAINT flight_mixed_date_less_equal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_le_timestamp(calendar_value, local_value) = less_equal_record END),
  CONSTRAINT flight_mixed_date_greater CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_gt_timestamp(calendar_value, local_value) = greater_record END),
  CONSTRAINT flight_mixed_date_greater_equal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_ge_timestamp(calendar_value, local_value) = greater_equal_record END),
  CONSTRAINT flight_mixed_timestamp_equal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_eq_date(local_value, calendar_value) = equal_record END),
  CONSTRAINT flight_mixed_timestamp_unequal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_ne_date(local_value, calendar_value) = unequal_record END),
  CONSTRAINT flight_mixed_timestamp_less CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_lt_date(local_value, calendar_value) = greater_record END),
  CONSTRAINT flight_mixed_timestamp_less_equal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_le_date(local_value, calendar_value) = greater_equal_record END),
  CONSTRAINT flight_mixed_timestamp_greater CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_gt_date(local_value, calendar_value) = less_record END),
  CONSTRAINT flight_mixed_timestamp_greater_equal CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp_ge_date(local_value, calendar_value) = less_equal_record END)
);

CREATE TABLE flight_calendar_shift (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  calendar_value date,
  other_calendar date,
  days integer,
  local_value timestamp,
  difference_record integer,
  plus_record date,
  minus_record date,
  swapped_plus_record date,
  timestamp_record timestamp,
  date_record date,
  CONSTRAINT flight_calendar_difference CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_mi(calendar_value, other_calendar) = difference_record END),
  CONSTRAINT flight_calendar_plus CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_pli(calendar_value, days) = plus_record END),
  CONSTRAINT flight_calendar_minus CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date_mii(calendar_value, days) = minus_record END),
  CONSTRAINT flight_calendar_swapped_plus CHECK (CASE WHEN skip THEN true ELSE pg_catalog.integer_pl_date(days, calendar_value) = swapped_plus_record END),
  CONSTRAINT flight_calendar_to_timestamp CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp(calendar_value) = timestamp_record END),
  CONSTRAINT flight_calendar_from_timestamp CHECK (CASE WHEN skip THEN true ELSE pg_catalog.date(local_value) = date_record END)
);

CREATE TABLE flight_precision (
  id integer PRIMARY KEY,
  skip boolean NOT NULL DEFAULT false,
  local_value timestamp,
  instant_value timestamptz,
  precision integer,
  local_record timestamp,
  instant_record timestamptz,
  CONSTRAINT flight_precision_local CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamp(local_value, precision) = local_record END),
  CONSTRAINT flight_precision_instant CHECK (CASE WHEN skip THEN true ELSE pg_catalog.timestamptz(instant_value, precision) = instant_record END)
);


CREATE TABLE arrival_calendar_buckets (
  id integer PRIMARY KEY,
  arrival_time timestamp,
  unit_name text,
  bucket_time timestamp,
  accept_unbucketed boolean NOT NULL,
  CONSTRAINT arrival_calendar_bucket CHECK (
    CASE WHEN accept_unbucketed THEN true
    ELSE date_trunc(unit_name, arrival_time) = bucket_time END
  )
);

CREATE TABLE arrival_calendar_fields (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  arrival_day date,
  calendar_field text,
  recorded_field numeric,
  CONSTRAINT arrival_calendar_field CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.extract(calendar_field, arrival_day) = recorded_field END)
);
