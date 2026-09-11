-- An electrical distribution domain. Grid nodes form a hierarchy, meters
-- report readings, incidents attach operational state to those readings, and
-- dispatch actions record the response.

CREATE TYPE grid_node_state AS ENUM ('energized', 'offline', 'retired');
CREATE TYPE reading_quality AS ENUM ('accepted', 'missing', 'suppressed');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'resolved', 'suppressed');

CREATE TABLE grid_nodes (
  id              int PRIMARY KEY,
  parent_id       int REFERENCES grid_nodes (id),
  node_code       text NOT NULL UNIQUE,
  node_state      grid_node_state NOT NULL,
  region          text NOT NULL,
  commissioned_on date NOT NULL,
  energized_at    timestamptz,
  retired_on      date,
  capacity_mw     numeric,
  service_marker  text GENERATED ALWAYS AS (
    CASE WHEN energized_at IS NULL THEN NULL ELSE node_code END
  ) STORED,
  CONSTRAINT node_names_present
    CHECK (node_code <> '' AND region <> ''),
  CONSTRAINT node_state_evidence
    CHECK (CASE node_state
      WHEN 'energized' THEN energized_at IS NOT NULL AND retired_on IS NULL
      WHEN 'offline' THEN retired_on IS NULL
      WHEN 'retired' THEN retired_on IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT node_energizing_follows_commission
    CHECK (energized_at IS NULL OR energized_at::date >= commissioned_on),
  CONSTRAINT node_retirement_follows_commission
    CHECK (retired_on IS NULL OR retired_on >= commissioned_on),
  CONSTRAINT node_capacity_while_in_service
    CHECK (capacity_mw IS NULL OR (capacity_mw > 0 AND retired_on IS NULL)),
  CONSTRAINT node_not_its_own_parent
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TABLE meters (
  id               int PRIMARY KEY,
  node_id          int NOT NULL REFERENCES grid_nodes (id),
  serial_number    text NOT NULL UNIQUE,
  meter_kind       text NOT NULL,
  installed_on     date NOT NULL,
  retired_on       date,
  interval_minutes int,
  calibration_due  date,
  CONSTRAINT meter_identity_present
    CHECK (serial_number <> '' AND meter_kind <> ''),
  CONSTRAINT meter_service_dates
    CHECK (retired_on IS NULL OR retired_on >= installed_on),
  CONSTRAINT meter_calibration_dates
    CHECK (calibration_due IS NULL OR calibration_due >= installed_on),
  CONSTRAINT meter_interval_for_live_units
    CHECK (interval_minutes IS NULL OR (interval_minutes > 0 AND retired_on IS NULL))
);

CREATE TABLE meter_readings (
  id            int PRIMARY KEY,
  meter_id      int NOT NULL REFERENCES meters (id),
  observed_at   timestamptz NOT NULL,
  quality       reading_quality NOT NULL,
  demand_mw     numeric,
  voltage_kv    numeric,
  suppressed_at timestamptz,
  note          text,
  CONSTRAINT reading_quality_evidence
    CHECK (CASE quality
      WHEN 'accepted' THEN demand_mw IS NOT NULL AND suppressed_at IS NULL
      WHEN 'missing' THEN demand_mw IS NULL AND suppressed_at IS NULL
      WHEN 'suppressed' THEN suppressed_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT reading_values_move_together
    CHECK (demand_mw IS NULL OR voltage_kv IS NOT NULL),
  CONSTRAINT reading_suppression_follows_observation
    CHECK (suppressed_at IS NULL OR suppressed_at >= observed_at),
  CONSTRAINT reading_note_distinguishes_quality
    CHECK (note IS NULL OR note <> quality::text)
);

CREATE TABLE grid_incidents (
  id          int PRIMARY KEY,
  node_id     int NOT NULL REFERENCES grid_nodes (id),
  reading_id  int REFERENCES meter_readings (id),
  status      incident_status NOT NULL,
  severity    int NOT NULL,
  opened_at   timestamptz NOT NULL,
  resolved_at timestamptz,
  assignee    text,
  summary     text,
  CONSTRAINT incident_state_evidence
    CHECK (CASE status
      WHEN 'open' THEN resolved_at IS NULL
      WHEN 'investigating' THEN assignee IS NOT NULL AND resolved_at IS NULL
      WHEN 'resolved' THEN assignee IS NOT NULL AND resolved_at IS NOT NULL
      WHEN 'suppressed' THEN resolved_at IS NULL
      ELSE NULL
    END),
  CONSTRAINT incident_resolution_follows_open
    CHECK (resolved_at IS NULL OR resolved_at >= opened_at),
  CONSTRAINT incident_severity_summary
    CHECK (severity > 0 AND (summary IS NULL OR summary <> '')),
  CONSTRAINT incident_reading_or_assignee
    CHECK (reading_id IS NOT NULL OR assignee IS NOT NULL)
);

CREATE TABLE dispatch_actions (
  id                 int PRIMARY KEY,
  incident_id        int NOT NULL REFERENCES grid_incidents (id),
  operator_name      text NOT NULL,
  dispatched_at      timestamptz NOT NULL,
  completed_at       timestamptz,
  outcome            text,
  suppression_reason text,
  CONSTRAINT dispatch_completion_evidence
    CHECK (completed_at IS NULL OR (outcome IS NOT NULL AND completed_at >= dispatched_at)),
  CONSTRAINT dispatch_operator_and_outcome
    CHECK (operator_name <> '' AND (outcome IS NULL OR outcome <> '')),
  CONSTRAINT dispatch_suppression_exclusive
    CHECK (suppression_reason IS NULL OR completed_at IS NULL)
);
