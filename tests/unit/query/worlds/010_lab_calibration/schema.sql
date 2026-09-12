CREATE SCHEMA lab;
CREATE SCHEMA cal_primary;
CREATE SCHEMA cal_secondary;

CREATE DOMAIN lab.reading AS numeric(10, 3);

CREATE FUNCTION cal_primary.normalize_strict(value lab.reading)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
AS $$ SELECT round($1::numeric, 1) $$;

CREATE FUNCTION cal_primary.normalize_lenient(value lab.reading)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$ SELECT coalesce(round($1::numeric, 1), 0::numeric) $$;

CREATE OPERATOR cal_primary.!! (
  RIGHTARG = lab.reading,
  FUNCTION = cal_primary.normalize_strict
);

CREATE OPERATOR cal_primary.@@ (
  RIGHTARG = lab.reading,
  FUNCTION = cal_primary.normalize_lenient
);

CREATE FUNCTION cal_primary.route_reading(left_value lab.reading, right_value lab.reading)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce($1::numeric, 0::numeric)
       + coalesce($2::numeric, 0::numeric)
       + 100::numeric
$$;

CREATE FUNCTION cal_secondary.route_reading(left_value lab.reading, right_value lab.reading)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
AS $$ SELECT $1::numeric + $2::numeric + 200::numeric $$;

CREATE FUNCTION cal_primary.route_label(left_value text, right_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$ SELECT $1 || ':' || $2 $$;

CREATE OPERATOR cal_primary.+ (
  LEFTARG = lab.reading,
  RIGHTARG = lab.reading,
  FUNCTION = cal_primary.route_reading
);

CREATE OPERATOR cal_secondary.+ (
  LEFTARG = lab.reading,
  RIGHTARG = lab.reading,
  FUNCTION = cal_secondary.route_reading
);

CREATE OPERATOR cal_primary.+ (
  LEFTARG = text,
  RIGHTARG = text,
  FUNCTION = cal_primary.route_label
);

CREATE FUNCTION cal_primary.within_tolerance(value lab.reading, target numeric)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
AS $$ SELECT abs($1::numeric - $2) <= 0.5 $$;

CREATE FUNCTION cal_primary.lenient_tolerance(value lab.reading, target numeric)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT $1 IS NULL OR $2 IS NULL OR abs($1::numeric - $2) <= 0.5
$$;

CREATE OPERATOR cal_primary.~= (
  LEFTARG = lab.reading,
  RIGHTARG = numeric,
  FUNCTION = cal_primary.within_tolerance
);

CREATE OPERATOR cal_primary.~== (
  LEFTARG = lab.reading,
  RIGHTARG = numeric,
  FUNCTION = cal_primary.lenient_tolerance
);

SET search_path = public;

CREATE TABLE laboratories (
  laboratory_id  integer PRIMARY KEY,
  laboratory_code text NOT NULL UNIQUE,
  display_name    text NOT NULL,
  region_code     text NOT NULL,
  commissioned_on date NOT NULL,
  retired_on      date,
  operating_note  text,
  CONSTRAINT laboratory_identity
    CHECK (laboratory_code <> '' AND display_name <> '' AND region_code <> ''),
  CONSTRAINT laboratory_service_window
    CHECK (retired_on IS NULL OR retired_on >= commissioned_on),
  CONSTRAINT laboratory_note_identity
    CHECK (operating_note IS NULL OR operating_note <> laboratory_code)
);

CREATE TABLE instruments (
  instrument_id   integer PRIMARY KEY,
  laboratory_id   integer NOT NULL REFERENCES public.laboratories (laboratory_id),
  serial_number   text NOT NULL UNIQUE,
  model_name      text NOT NULL,
  installed_on    date NOT NULL,
  retired_on      date,
  last_service_on date,
  service_note    text,
  service_state text GENERATED ALWAYS AS (
    CASE WHEN last_service_on IS NULL THEN NULL ELSE serial_number || ':serviced' END
  ) STORED,
  CONSTRAINT instrument_identity
    CHECK (serial_number <> '' AND model_name <> ''),
  CONSTRAINT instrument_service_window
    CHECK (retired_on IS NULL OR retired_on >= installed_on),
  CONSTRAINT instrument_maintenance_window
    CHECK (last_service_on IS NULL OR last_service_on >= installed_on),
  CONSTRAINT instrument_note_identity
    CHECK (service_note IS NULL OR service_note <> serial_number)
);

CREATE TABLE calibration_policies (
  policy_id        integer PRIMARY KEY,
  laboratory_id    integer NOT NULL REFERENCES public.laboratories (laboratory_id),
  policy_code      text NOT NULL,
  tolerance        numeric NOT NULL,
  effective_on     date NOT NULL,
  expires_on       date,
  fallback_reading lab.reading,
  policy_note      text,
  band_label text GENERATED ALWAYS AS (
    CASE WHEN fallback_reading IS NULL
      THEN NULL ELSE policy_code || ':' || fallback_reading::text END
  ) STORED,
  UNIQUE (laboratory_id, policy_code),
  CONSTRAINT policy_identity
    CHECK (policy_code <> '' AND tolerance > 0),
  CONSTRAINT policy_effective_window
    CHECK (expires_on IS NULL OR expires_on >= effective_on),
  CONSTRAINT policy_fallback_state
    CHECK (fallback_reading IS NULL OR fallback_reading >= 0),
  CONSTRAINT policy_note_identity
    CHECK (policy_note IS NULL OR policy_note <> policy_code)
);

CREATE TABLE calibration_runs (
  run_id          integer PRIMARY KEY,
  instrument_id   integer NOT NULL REFERENCES public.instruments (instrument_id),
  policy_id       integer NOT NULL REFERENCES public.calibration_policies (policy_id),
  run_code        text NOT NULL UNIQUE,
  started_at      timestamptz NOT NULL,
  completed_at    timestamptz,
  run_state       text NOT NULL,
  operator_label  text NOT NULL,
  run_note        text,
  completion_label text GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NULL THEN NULL ELSE run_code || ':complete' END
  ) STORED,
  CONSTRAINT run_identity
    CHECK (run_code <> '' AND operator_label <> ''),
  CONSTRAINT run_state_window
    CHECK (
      (run_state = 'open' AND completed_at IS NULL)
      OR (run_state = 'complete' AND completed_at IS NOT NULL AND completed_at >= started_at)
    ),
  CONSTRAINT run_note_identity
    CHECK (run_note IS NULL OR run_note <> run_code)
);

CREATE TABLE observations (
  observation_id   integer PRIMARY KEY,
  run_id            integer NOT NULL REFERENCES public.calibration_runs (run_id),
  sequence_number   integer NOT NULL,
  observed_at       timestamptz NOT NULL,
  raw_reading       lab.reading,
  reference_reading lab.reading NOT NULL,
  ambient_celsius   numeric,
  observation_note  text,
  normalized_preview numeric GENERATED ALWAYS AS (
    CASE WHEN raw_reading IS NULL
      THEN NULL ELSE OPERATOR(cal_primary.!!) raw_reading END
  ) STORED,
  UNIQUE (run_id, sequence_number),
  CONSTRAINT observation_sequence
    CHECK (sequence_number > 0 AND reference_reading >= 0),
  CONSTRAINT observation_reading_state
    CHECK (raw_reading IS NULL OR (raw_reading >= 0 AND reference_reading >= 0)),
  CONSTRAINT observation_ambient_state
    CHECK (ambient_celsius IS NULL OR ambient_celsius BETWEEN -80 AND 120),
  CONSTRAINT observation_note_identity
    CHECK (observation_note IS NULL OR observation_note <> sequence_number::text)
);

CREATE TABLE review_audits (
  audit_id          integer PRIMARY KEY,
  run_id            integer NOT NULL REFERENCES public.calibration_runs (run_id),
  observation_id    integer REFERENCES public.observations (observation_id),
  reviewer_label    text NOT NULL,
  normalized_value  lab.reading NOT NULL,
  control_value     numeric NOT NULL,
  review_state      text NOT NULL,
  reviewed_at       timestamptz NOT NULL,
  review_note       text,
  review_marker text GENERATED ALWAYS AS (
    CASE WHEN review_note IS NULL
      THEN NULL ELSE reviewer_label || ':' || review_note END
  ) STORED,
  CONSTRAINT audit_identity
    CHECK (reviewer_label <> '' AND review_state IN ('pending', 'accepted')),
  CONSTRAINT audit_values
    CHECK (normalized_value >= 0 AND control_value >= 0),
  CONSTRAINT audit_observation_state
    CHECK (observation_id IS NOT NULL OR review_state = 'pending'),
  CONSTRAINT audit_note_identity
    CHECK (review_note IS NULL OR review_note <> reviewer_label)
);

CREATE TABLE calibration_requests (
  request_id        integer PRIMARY KEY,
  run_id            integer NOT NULL REFERENCES public.calibration_runs (run_id),
  observation_id    integer REFERENCES public.observations (observation_id),
  requested_reading lab.reading,
  normalized_value  numeric NOT NULL,
  adjustment_value  numeric NOT NULL,
  request_kind      text NOT NULL,
  requested_by      text NOT NULL,
  requested_at      timestamptz NOT NULL,
  applied_at        timestamptz,
  request_note      text,
  request_marker text GENERATED ALWAYS AS (
    CASE WHEN request_note IS NULL
      THEN NULL ELSE requested_by || ':' || request_note END
  ) STORED,
  CONSTRAINT request_identity
    CHECK (request_kind IN ('review', 'adjust') AND requested_by <> ''),
  CONSTRAINT request_values
    CHECK (normalized_value >= 0 AND adjustment_value >= 0),
  CONSTRAINT request_reading_state
    CHECK (
      requested_reading IS NULL
      OR (requested_reading >= 0 AND adjustment_value >= 0)
    ),
  CONSTRAINT request_application_window
    CHECK (applied_at IS NULL OR applied_at >= requested_at),
  CONSTRAINT request_note_identity
    CHECK (request_note IS NULL OR request_note <> requested_by)
);
