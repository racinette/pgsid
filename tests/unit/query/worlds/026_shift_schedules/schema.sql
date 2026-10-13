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
