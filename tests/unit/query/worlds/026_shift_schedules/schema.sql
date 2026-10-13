-- @world checks
CREATE DOMAIN daily_clock AS time CHECK (VALUE BETWEEN TIME '00:00' AND TIME '24:00');

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
  planned_duration interval NOT NULL,
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
