-- @world checks
CREATE DOMAIN daily_clock AS time CHECK (VALUE BETWEEN TIME '00:00' AND TIME '24:00');
CREATE DOMAIN nonnegative_duration AS interval CHECK (VALUE >= INTERVAL '0');

CREATE TABLE shift_templates (
  id integer PRIMARY KEY,
  label text NOT NULL,
  starts_at daily_clock NOT NULL,
  ends_at time,
  planned_duration interval,
  CONSTRAINT shift_clock_order CHECK (starts_at <= ends_at),
  CONSTRAINT shift_duration CHECK (ends_at - starts_at = planned_duration)
);

CREATE TABLE service_windows (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  minimum_duration interval,
  planned_duration nonnegative_duration NOT NULL,
  maximum_duration interval,
  CONSTRAINT service_duration_bounds CHECK (planned_duration BETWEEN minimum_duration AND maximum_duration),
  CONSTRAINT service_duration_span CHECK (maximum_duration - minimum_duration >= planned_duration - planned_duration)
);

CREATE TABLE zoned_dispatches (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  local_departure time NOT NULL,
  zoned_departure timetz,
  adjustment interval,
  adjusted_departure timetz,
  skip_adjustment boolean NOT NULL,
  CONSTRAINT dispatch_local_clock CHECK (local_departure = zoned_departure::time),
  CONSTRAINT dispatch_adjustment CHECK (CASE WHEN skip_adjustment THEN true ELSE zoned_departure + adjustment IS NOT DISTINCT FROM adjusted_departure END)
);

CREATE TABLE duration_imports (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  raw_duration text,
  expected_duration interval,
  skip_import boolean NOT NULL,
  CONSTRAINT duration_import_match CHECK (CASE WHEN skip_import THEN true ELSE raw_duration::interval IS NOT DISTINCT FROM expected_duration END),
  CONSTRAINT duration_import_precision CHECK (CASE WHEN skip_import THEN true ELSE raw_duration::interval(3) IS NOT DISTINCT FROM expected_duration::interval(3) END),
  CONSTRAINT duration_import_justify CHECK (CASE WHEN skip_import THEN true ELSE justify_interval(raw_duration::interval) = expected_duration END),
  CONSTRAINT duration_import_scale CHECK (CASE WHEN skip_import THEN true ELSE raw_duration::interval * 0.5::float8 = expected_duration / 2::float8 END)
);

CREATE TABLE departure_plans (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  service_day date NOT NULL,
  local_departure time,
  zoned_departure timetz,
  recorded_local timestamp,
  recorded_instant timestamptz,
  skip_validation boolean NOT NULL,
  CONSTRAINT departure_calendar_clock CHECK (CASE WHEN skip_validation THEN true ELSE service_day + local_departure IS NOT DISTINCT FROM recorded_local END),
  CONSTRAINT departure_calendar_instant CHECK (CASE WHEN skip_validation THEN true ELSE service_day + zoned_departure IS NOT DISTINCT FROM recorded_instant END),
  CONSTRAINT departure_clock_precision CHECK (CASE WHEN skip_validation THEN true ELSE recorded_local::time::time(3) = (local_departure + INTERVAL '0')::time(3) END)
);

CREATE TABLE clock_imports (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  raw_local text,
  raw_zoned text,
  expected_local daily_clock,
  expected_zoned timetz,
  printed_label text,
  skip_import boolean NOT NULL,
  CONSTRAINT clock_import_local CHECK (CASE WHEN skip_import THEN true ELSE raw_local::time IS NOT DISTINCT FROM expected_local END),
  CONSTRAINT clock_import_zoned CHECK (CASE WHEN skip_import THEN true ELSE raw_zoned::timetz IS NOT DISTINCT FROM expected_zoned END),
  CONSTRAINT clock_import_label CHECK (CASE WHEN skip_import THEN true ELSE expected_zoned::text = printed_label END)
);

CREATE TABLE maintenance_adjustments (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  duration_years integer,
  duration_months integer,
  duration_weeks integer,
  duration_days integer,
  duration_hours integer,
  duration_minutes integer,
  duration_seconds double precision,
  expected_duration interval,
  service_day date NOT NULL,
  requested_at timestamp,
  expected_day timestamp,
  expected_at timestamp,
  expected_elapsed interval,
  skip_adjustment boolean NOT NULL,
  CONSTRAINT maintenance_parts CHECK (CASE WHEN skip_adjustment THEN true ELSE make_interval(duration_years,duration_months,duration_weeks,duration_days,duration_hours,duration_minutes,duration_seconds) IS NOT DISTINCT FROM expected_duration END),
  CONSTRAINT maintenance_precision CHECK (CASE WHEN skip_adjustment THEN true ELSE make_interval(duration_years,duration_months,duration_weeks,duration_days,duration_hours,duration_minutes,duration_seconds)::interval(3) IS NOT DISTINCT FROM expected_duration::interval(3) END),
  CONSTRAINT maintenance_day CHECK (CASE WHEN skip_adjustment THEN true ELSE service_day + expected_duration IS NOT DISTINCT FROM expected_day END),
  CONSTRAINT maintenance_clock CHECK (CASE WHEN skip_adjustment THEN true ELSE requested_at + expected_duration IS NOT DISTINCT FROM expected_at END),
  CONSTRAINT maintenance_elapsed CHECK (CASE WHEN skip_adjustment THEN true ELSE expected_at - requested_at IS NOT DISTINCT FROM expected_elapsed END)
);

CREATE TABLE shift_audit_fields (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  local_clock daily_clock,
  zoned_clock timetz,
  field_name text,
  local_field numeric,
  zoned_field numeric,
  local_legacy double precision,
  zoned_legacy double precision,
  hash_seed bigint,
  local_digest integer,
  zoned_digest integer,
  local_seeded_digest bigint,
  zoned_seeded_digest bigint,
  adjustment interval,
  recorded_local time,
  recorded_zoned timetz,
  skip_audit boolean NOT NULL,
  CONSTRAINT audit_local_field CHECK (CASE WHEN skip_audit THEN true ELSE pg_catalog."extract"(field_name,local_clock) = local_field END),
  CONSTRAINT audit_zoned_field CHECK (CASE WHEN skip_audit THEN true ELSE pg_catalog."extract"(field_name,zoned_clock) = zoned_field END),
  CONSTRAINT audit_local_legacy CHECK (CASE WHEN skip_audit THEN true ELSE date_part(field_name,local_clock) = local_legacy END),
  CONSTRAINT audit_zoned_legacy CHECK (CASE WHEN skip_audit THEN true ELSE date_part(field_name,zoned_clock) = zoned_legacy END),
  CONSTRAINT audit_local_digest CHECK (CASE WHEN skip_audit THEN true ELSE time_hash(local_clock) = local_digest END),
  CONSTRAINT audit_zoned_digest CHECK (CASE WHEN skip_audit THEN true ELSE timetz_hash(zoned_clock) = zoned_digest END),
  CONSTRAINT audit_local_seeded_digest CHECK (CASE WHEN skip_audit THEN true ELSE time_hash_extended(local_clock,hash_seed) = local_seeded_digest END),
  CONSTRAINT audit_zoned_seeded_digest CHECK (CASE WHEN skip_audit THEN true ELSE timetz_hash_extended(zoned_clock,hash_seed) = zoned_seeded_digest END),
  CONSTRAINT audit_local_adjustment CHECK (CASE WHEN skip_audit THEN true ELSE adjustment + local_clock = recorded_local END),
  CONSTRAINT audit_zoned_adjustment CHECK (CASE WHEN skip_audit THEN true ELSE adjustment + zoned_clock = recorded_zoned END)
);
CREATE TABLE duration_audit_fields (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  duration interval,
  field_name text,
  recorded_field numeric,
  recorded_legacy double precision,
  truncation_field text,
  recorded_truncation interval,
  hash_seed bigint,
  digest integer,
  seeded_digest bigint,
  skip_audit boolean NOT NULL,
  CONSTRAINT audit_duration_field CHECK (CASE WHEN skip_audit THEN true ELSE pg_catalog."extract"(field_name,duration) = recorded_field END),
  CONSTRAINT audit_duration_legacy CHECK (CASE WHEN skip_audit THEN true ELSE date_part(field_name,duration) = recorded_legacy END),
  CONSTRAINT audit_duration_truncation CHECK (CASE WHEN skip_audit THEN true ELSE date_trunc(truncation_field,duration) = recorded_truncation END),
  CONSTRAINT audit_duration_digest CHECK (CASE WHEN skip_audit THEN true ELSE interval_hash(duration) = digest END),
  CONSTRAINT audit_duration_seeded_digest CHECK (CASE WHEN skip_audit THEN true ELSE interval_hash_extended(duration,hash_seed) = seeded_digest END)
);
CREATE TABLE event_bucket_records (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  bucket_width interval,
  observed_local timestamp,
  origin_local timestamp,
  recorded_local timestamp,
  observed_instant timestamptz,
  origin_instant timestamptz,
  recorded_instant timestamptz,
  recorded_age interval,
  skip_audit boolean NOT NULL,
  CONSTRAINT event_local_bucket CHECK (CASE WHEN skip_audit THEN true ELSE date_bin(bucket_width,observed_local,origin_local) = recorded_local END),
  CONSTRAINT event_instant_bucket CHECK (CASE WHEN skip_audit THEN true ELSE date_bin(bucket_width,observed_instant,origin_instant) = recorded_instant END),
  CONSTRAINT event_calendar_age CHECK (CASE WHEN skip_audit THEN true ELSE age(observed_local,origin_local) = recorded_age END)
);

CREATE TABLE clock_tolerances (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  candidate_clock time,
  base_clock time,
  candidate_zoned timetz,
  base_zoned timetz,
  tolerance interval,
  subtract_offset boolean,
  compare_less boolean,
  recorded_local boolean,
  recorded_zoned boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT tolerance_local CHECK (CASE WHEN skip_validation THEN true ELSE in_range(candidate_clock,base_clock,tolerance,subtract_offset,compare_less) = recorded_local END),
  CONSTRAINT tolerance_zoned CHECK (CASE WHEN skip_validation THEN true ELSE in_range(candidate_zoned,base_zoned,tolerance,subtract_offset,compare_less) = recorded_zoned END)
);
CREATE TABLE calendar_tolerances (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  candidate_day date,
  base_day date,
  candidate_at timestamp,
  base_at timestamp,
  candidate_duration interval,
  base_duration interval,
  tolerance interval,
  subtract_offset boolean,
  compare_less boolean,
  recorded_day boolean,
  recorded_at boolean,
  recorded_duration boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT tolerance_calendar_day CHECK (CASE WHEN skip_validation THEN true ELSE in_range(candidate_day,base_day,tolerance,subtract_offset,compare_less) = recorded_day END),
  CONSTRAINT tolerance_calendar_clock CHECK (CASE WHEN skip_validation THEN true ELSE in_range(candidate_at,base_at,tolerance,subtract_offset,compare_less) = recorded_at END),
  CONSTRAINT tolerance_duration CHECK (CASE WHEN skip_validation THEN true ELSE in_range(candidate_duration,base_duration,tolerance,subtract_offset,compare_less) = recorded_duration END)
);
CREATE TABLE fixed_zone_records (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  zone_offset interval,
  source_local timestamp,
  source_instant timestamptz,
  source_clock timetz,
  recorded_instant timestamptz,
  recorded_local timestamp,
  recorded_clock timetz,
  recorded_label text,
  recorded_offset numeric,
  skip_validation boolean NOT NULL,
  CONSTRAINT fixed_zone_instant CHECK (CASE WHEN skip_validation THEN true ELSE timezone(zone_offset,source_local) = recorded_instant END),
  CONSTRAINT fixed_zone_local CHECK (CASE WHEN skip_validation THEN true ELSE timezone(zone_offset,source_instant) = recorded_local END),
  CONSTRAINT fixed_zone_clock CHECK (CASE WHEN skip_validation THEN true ELSE timezone(zone_offset,source_clock) = recorded_clock END),
  CONSTRAINT fixed_zone_label CHECK (CASE WHEN skip_validation THEN true ELSE recorded_clock::text = recorded_label END),
  CONSTRAINT fixed_zone_offset CHECK (CASE WHEN skip_validation THEN true ELSE pg_catalog."extract"('timezone',recorded_clock) = recorded_offset END)
);

CREATE TABLE zoned_calendar_adjustments (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  source_instant timestamptz NOT NULL,
  calendar_span interval,
  zone_name text NOT NULL,
  recorded_addition timestamptz,
  recorded_subtraction timestamptz,
  recorded_return timestamptz,
  skip_validation boolean NOT NULL,
  CONSTRAINT zoned_calendar_add CHECK (CASE WHEN skip_validation THEN true ELSE date_add(source_instant, calendar_span, zone_name) = recorded_addition END),
  CONSTRAINT zoned_calendar_subtract CHECK (CASE WHEN skip_validation THEN true ELSE date_subtract(source_instant, calendar_span, zone_name) = recorded_subtraction END),
  CONSTRAINT zoned_calendar_return CHECK (CASE WHEN skip_validation THEN true ELSE date_subtract(date_add(source_instant, calendar_span, zone_name), calendar_span, zone_name) = recorded_return END)
);

CREATE TABLE local_shift_conflicts (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  first_starts_at time NOT NULL,
  first_ends_at time,
  first_duration interval NOT NULL,
  second_starts_at time,
  second_ends_at time,
  second_duration interval NOT NULL,
  endpoint_overlap boolean,
  first_duration_overlap boolean,
  second_duration_overlap boolean,
  both_duration_overlap boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT local_conflict_endpoints CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_ends_at) OVERLAPS (second_starts_at,second_ends_at) = endpoint_overlap END),
  CONSTRAINT local_conflict_first_duration CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_duration) OVERLAPS (second_starts_at,second_ends_at) = first_duration_overlap END),
  CONSTRAINT local_conflict_second_duration CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_ends_at) OVERLAPS (second_starts_at,second_duration) = second_duration_overlap END),
  CONSTRAINT local_conflict_both_durations CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_duration) OVERLAPS (second_starts_at,second_duration) = both_duration_overlap END)
);
CREATE TABLE calendar_shift_conflicts (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  first_starts_at timestamp NOT NULL,
  first_ends_at timestamp,
  first_duration interval NOT NULL,
  second_starts_at timestamp,
  second_ends_at timestamp,
  second_duration interval NOT NULL,
  endpoint_overlap boolean,
  first_duration_overlap boolean,
  second_duration_overlap boolean,
  both_duration_overlap boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT calendar_conflict_endpoints CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_ends_at) OVERLAPS (second_starts_at,second_ends_at) = endpoint_overlap END),
  CONSTRAINT calendar_conflict_first_duration CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_duration) OVERLAPS (second_starts_at,second_ends_at) = first_duration_overlap END),
  CONSTRAINT calendar_conflict_second_duration CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_ends_at) OVERLAPS (second_starts_at,second_duration) = second_duration_overlap END),
  CONSTRAINT calendar_conflict_both_durations CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_duration) OVERLAPS (second_starts_at,second_duration) = both_duration_overlap END)
);
CREATE TABLE zoned_shift_conflicts (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  first_starts_at timetz NOT NULL,
  first_ends_at timetz,
  second_starts_at timetz,
  second_ends_at timetz,
  recorded_overlap boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT zoned_conflict_forward CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_ends_at) OVERLAPS (second_starts_at,second_ends_at) = recorded_overlap END),
  CONSTRAINT zoned_conflict_reverse CHECK (CASE WHEN skip_validation THEN true ELSE (second_ends_at,second_starts_at) OVERLAPS (first_ends_at,first_starts_at) = recorded_overlap END)
);
CREATE TABLE instant_shift_conflicts (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  first_starts_at timestamptz NOT NULL,
  first_ends_at timestamptz,
  second_starts_at timestamptz,
  second_ends_at timestamptz,
  recorded_overlap boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT instant_conflict_forward CHECK (CASE WHEN skip_validation THEN true ELSE (first_starts_at,first_ends_at) OVERLAPS (second_starts_at,second_ends_at) = recorded_overlap END),
  CONSTRAINT instant_conflict_reverse CHECK (CASE WHEN skip_validation THEN true ELSE (second_ends_at,second_starts_at) OVERLAPS (first_ends_at,first_starts_at) = recorded_overlap END)
);

CREATE TABLE calendar_field_records (
  id integer PRIMARY KEY,
  template_id integer NOT NULL REFERENCES shift_templates (id),
  source_local timestamp NOT NULL,
  field_name text NOT NULL,
  recorded_value double precision,
  recorded_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT calendar_field_value CHECK (CASE WHEN skip_validation THEN true ELSE date_part(field_name,source_local) IS NOT DISTINCT FROM recorded_value END),
  CONSTRAINT calendar_field_wire CHECK (CASE WHEN skip_validation THEN true ELSE float8send(date_part(field_name,source_local)) = recorded_wire END)
);
