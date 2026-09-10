-- A clinic scheduling domain. Patients attend visits, and a visit may produce
-- laboratory samples whose collection and verification states carry evidence.

CREATE TYPE visit_state AS ENUM ('scheduled', 'arrived', 'closed');
CREATE TYPE sample_state AS ENUM ('ordered', 'collected', 'verified');

CREATE TABLE patients (
  id                int PRIMARY KEY,
  full_name         text NOT NULL,
  date_of_birth     date NOT NULL,
  email             text,
  phone             text,
  emergency_contact text,
  CONSTRAINT patient_identity_sane
    CHECK (full_name <> '' AND date_of_birth <= DATE '2025-01-01'),
  CONSTRAINT patient_contact_format
    CHECK (email IS NULL OR phone IS NULL OR email <> phone)
);

CREATE TABLE visits (
  id            int PRIMARY KEY,
  patient_id    int NOT NULL REFERENCES patients (id),
  clinician     text NOT NULL,
  scheduled_at  timestamptz NOT NULL,
  state         visit_state NOT NULL,
  arrived_at    timestamptz,
  closed_at     timestamptz,
  room          text,
  summary_left  text,
  summary_right text,
  summary_text  text GENERATED ALWAYS AS (
    CASE
      WHEN summary_left IS NULL AND summary_right IS NULL THEN NULL
      ELSE trim(coalesce(summary_left, '') || ' ' || coalesce(summary_right, ''))
    END
  ) STORED,
  CONSTRAINT visit_state_timing
    CHECK (CASE state
      WHEN 'scheduled' THEN arrived_at IS NULL AND closed_at IS NULL
      WHEN 'arrived' THEN arrived_at IS NOT NULL AND closed_at IS NULL
      WHEN 'closed' THEN arrived_at IS NOT NULL AND closed_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT visit_arrival_order
    CHECK (arrived_at IS NULL OR arrived_at >= scheduled_at),
  CONSTRAINT visit_close_order
    CHECK (closed_at IS NULL OR (arrived_at IS NOT NULL AND closed_at >= arrived_at)),
  CONSTRAINT visit_summary_parts_differ
    CHECK (summary_left IS NULL OR summary_right IS NULL OR summary_left <> summary_right)
);

CREATE TABLE lab_samples (
  id             int PRIMARY KEY,
  visit_id       int NOT NULL REFERENCES visits (id),
  test_name      text NOT NULL,
  state          sample_state NOT NULL,
  collected_at   timestamptz,
  result_value   text,
  result_unit    text,
  verified_at    timestamptz,
  reviewer       text,
  result_display text GENERATED ALWAYS AS (
    CASE
      WHEN result_value IS NULL THEN NULL
      ELSE trim(result_value || ' ' || coalesce(result_unit, ''))
    END
  ) STORED,
  CONSTRAINT sample_name_and_reviewer
    CHECK (test_name <> '' AND (reviewer IS NULL OR reviewer <> '')),
  CONSTRAINT sample_state_evidence
    CHECK (CASE state
      WHEN 'ordered' THEN collected_at IS NULL AND result_value IS NULL AND verified_at IS NULL
      WHEN 'collected' THEN collected_at IS NOT NULL AND verified_at IS NULL
      WHEN 'verified' THEN collected_at IS NOT NULL AND result_value IS NOT NULL
                           AND verified_at IS NOT NULL AND reviewer IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT sample_verification_follows_collection
    CHECK (verified_at IS NULL OR collected_at IS NOT NULL),
  CONSTRAINT sample_verification_has_result
    CHECK (verified_at IS NULL OR result_value IS NOT NULL),
  CONSTRAINT sample_result_has_unit
    CHECK (result_value IS NULL OR result_unit IS NOT NULL)
);
