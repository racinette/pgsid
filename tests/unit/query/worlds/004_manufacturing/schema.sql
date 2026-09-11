-- A manufacturing quality-control domain. Production runs happen on devices;
-- inspections examine a run and device, and recorded measurements belong to an
-- inspection.

CREATE TYPE device_state AS ENUM ('active', 'retired');
CREATE TYPE production_state AS ENUM ('planned', 'running', 'completed');
CREATE TYPE inspection_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE inspection_kind AS ENUM ('startup', 'in_process', 'final', 'safety');

CREATE TABLE devices (
  id               int PRIMARY KEY,
  serial_number    text NOT NULL UNIQUE,
  station_name     text NOT NULL,
  state            device_state NOT NULL,
  commissioned_on  date NOT NULL,
  retired_on       date,
  calibration_due  date,
  CONSTRAINT device_names_present
    CHECK (serial_number <> '' AND station_name <> ''),
  CONSTRAINT device_state_dates
    CHECK (CASE state
      WHEN 'active' THEN retired_on IS NULL
      WHEN 'retired' THEN retired_on IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT device_service_dates
    CHECK ((retired_on IS NULL OR retired_on >= commissioned_on)
           AND (calibration_due IS NULL OR calibration_due >= commissioned_on))
);

CREATE TABLE production_runs (
  id             int PRIMARY KEY,
  device_id      int NOT NULL REFERENCES devices (id),
  run_code       text NOT NULL UNIQUE,
  product_code   text NOT NULL,
  planned_qty    int NOT NULL,
  produced_qty   int,
  state          production_state NOT NULL,
  started_at     timestamptz NOT NULL,
  finished_at    timestamptz,
  notes          text,
  CONSTRAINT run_quantity_progress
    CHECK (produced_qty IS NULL OR (produced_qty >= 0 AND produced_qty <= planned_qty)),
  CONSTRAINT run_state_evidence
    CHECK (CASE state
      WHEN 'planned' THEN produced_qty IS NULL AND finished_at IS NULL
      WHEN 'running' THEN finished_at IS NULL
      WHEN 'completed' THEN produced_qty IS NOT NULL AND finished_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT run_timeline
    CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE inspections (
  id               int PRIMARY KEY,
  run_id           int NOT NULL REFERENCES production_runs (id),
  device_id        int NOT NULL REFERENCES devices (id),
  inspection_kind  inspection_kind NOT NULL,
  status           inspection_status NOT NULL,
  scheduled_at     timestamptz NOT NULL,
  inspected_at     timestamptz,
  inspector        text,
  outcome          text,
  notes            text,
  CONSTRAINT inspection_state_evidence
    CHECK (CASE status
      WHEN 'scheduled' THEN inspected_at IS NULL AND inspector IS NULL AND outcome IS NULL
      WHEN 'completed' THEN inspected_at IS NOT NULL AND inspector IS NOT NULL
                            AND outcome IS NOT NULL
      WHEN 'cancelled' THEN inspected_at IS NULL AND outcome IS NULL
      ELSE NULL
    END),
  CONSTRAINT inspection_chronology
    CHECK (inspected_at IS NULL OR inspected_at >= scheduled_at),
  CONSTRAINT inspection_outcome_notes_differ
    CHECK (outcome IS NULL OR notes IS NULL OR outcome <> notes)
);

CREATE TABLE inspection_results (
  id              int PRIMARY KEY,
  inspection_id   int NOT NULL REFERENCES inspections (id),
  metric_name     text NOT NULL,
  measured_value  numeric,
  lower_limit     numeric,
  upper_limit     numeric,
  recorded_at     timestamptz NOT NULL,
  comment         text,
  verdict         text GENERATED ALWAYS AS (
    CASE
      WHEN measured_value IS NULL THEN NULL
      WHEN lower_limit IS NOT NULL AND measured_value < lower_limit THEN 'fail'
      WHEN upper_limit IS NOT NULL AND measured_value > upper_limit THEN 'fail'
      ELSE 'pass'
    END
  ) STORED,
  UNIQUE (inspection_id, metric_name),
  CONSTRAINT result_limits_ordered
    CHECK (lower_limit IS NULL OR upper_limit IS NULL OR lower_limit <= upper_limit),
  CONSTRAINT result_measurement_named
    CHECK (measured_value IS NULL OR metric_name <> ''),
  CONSTRAINT result_comment_distinct
    CHECK (comment IS NULL OR comment <> metric_name)
);
