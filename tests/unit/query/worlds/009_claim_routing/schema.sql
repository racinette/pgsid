CREATE TABLE claim_tenants (
  tenant_id     int PRIMARY KEY,
  tenant_code   text NOT NULL UNIQUE,
  legal_name    text NOT NULL,
  home_region   text NOT NULL,
  opened_at     timestamptz NOT NULL,
  inactive_at   timestamptz,
  support_note  text,
  CONSTRAINT tenant_identity
    CHECK (tenant_code <> '' AND legal_name <> '' AND home_region <> ''),
  CONSTRAINT tenant_service_window
    CHECK (inactive_at IS NULL OR inactive_at >= opened_at),
  CONSTRAINT tenant_support_identity
    CHECK (support_note IS NULL OR support_note <> tenant_code)
);

CREATE TABLE claim_adjusters (
  tenant_id     int NOT NULL REFERENCES claim_tenants (tenant_id),
  adjuster_id   int NOT NULL,
  display_name  text NOT NULL,
  team_code     text NOT NULL,
  active_from   timestamptz NOT NULL,
  inactive_at   timestamptz,
  specialty     text,
  PRIMARY KEY (tenant_id, adjuster_id),
  CONSTRAINT adjuster_identity
    CHECK (display_name <> '' AND team_code <> ''),
  CONSTRAINT adjuster_service_window
    CHECK (inactive_at IS NULL OR inactive_at >= active_from),
  CONSTRAINT adjuster_specialty_identity
    CHECK (specialty IS NULL OR specialty <> team_code)
);

CREATE TABLE claim_policies (
  tenant_id       int NOT NULL REFERENCES claim_tenants (tenant_id),
  policy_id       int NOT NULL,
  policy_number   text NOT NULL,
  jurisdiction    text NOT NULL,
  effective_at    timestamptz NOT NULL,
  expires_at      timestamptz,
  coverage_note   text,
  lead_adjuster_id int,
  PRIMARY KEY (tenant_id, policy_id),
  UNIQUE (tenant_id, policy_number),
  FOREIGN KEY (tenant_id, lead_adjuster_id)
    REFERENCES claim_adjusters (tenant_id, adjuster_id),
  CONSTRAINT policy_identity
    CHECK (policy_number <> '' AND jurisdiction IN ('NA', 'EU')),
  CONSTRAINT policy_service_window
    CHECK (expires_at IS NULL OR expires_at >= effective_at),
  CONSTRAINT policy_coverage_identity
    CHECK (coverage_note IS NULL OR coverage_note <> policy_number)
);

CREATE TABLE claim_registry (
  tenant_id      int NOT NULL REFERENCES claim_tenants (tenant_id),
  claim_id       int NOT NULL,
  policy_id      int NOT NULL,
  external_ref   text NOT NULL,
  reported_at    timestamptz NOT NULL,
  claimant_note  text,
  closed_summary text,
  PRIMARY KEY (tenant_id, claim_id),
  UNIQUE (tenant_id, external_ref),
  FOREIGN KEY (tenant_id, policy_id)
    REFERENCES claim_policies (tenant_id, policy_id),
  CONSTRAINT registry_identity
    CHECK (external_ref <> '' AND policy_id > 0),
  CONSTRAINT registry_summary_state
    CHECK (closed_summary IS NULL OR claimant_note IS NULL OR closed_summary <> claimant_note),
  CONSTRAINT registry_report_identity
    CHECK (claimant_note IS NULL OR claimant_note <> external_ref)
);

CREATE TABLE claim_assignments (
  tenant_id      int NOT NULL REFERENCES claim_tenants (tenant_id),
  assignment_id  int NOT NULL,
  claim_id       int NOT NULL,
  adjuster_id    int NOT NULL,
  assigned_at    timestamptz NOT NULL,
  released_at    timestamptz,
  assignment_note text,
  PRIMARY KEY (tenant_id, assignment_id),
  FOREIGN KEY (tenant_id, claim_id)
    REFERENCES claim_registry (tenant_id, claim_id),
  FOREIGN KEY (tenant_id, adjuster_id)
    REFERENCES claim_adjusters (tenant_id, adjuster_id),
  CONSTRAINT assignment_window
    CHECK (released_at IS NULL OR released_at >= assigned_at),
  CONSTRAINT assignment_note_state
    CHECK (assignment_note IS NULL OR released_at IS NULL OR assignment_note <> released_at::text)
);

CREATE TABLE routed_claims (
  tenant_id       int NOT NULL,
  claim_id        int NOT NULL,
  jurisdiction    text NOT NULL,
  stage           text NOT NULL,
  policy_id       int NOT NULL,
  adjuster_id     int,
  loss_amount     numeric NOT NULL,
  reserve_amount  numeric,
  incident_at     timestamptz NOT NULL,
  intake_code     text NOT NULL,
  incident_note   text,
  resolution_note text,
  closed_at       timestamptz,
  review_note     text,
  open_marker text GENERATED ALWAYS AS (
    CASE WHEN closed_at IS NULL THEN intake_code ELSE NULL END
  ) STORED,
  settlement_marker text GENERATED ALWAYS AS (
    CASE WHEN stage = 'closed' THEN NULLIF(resolution_note, 'no payout') ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, claim_id, jurisdiction, stage),
  FOREIGN KEY (tenant_id, claim_id)
    REFERENCES claim_registry (tenant_id, claim_id),
  FOREIGN KEY (tenant_id, policy_id)
    REFERENCES claim_policies (tenant_id, policy_id),
  FOREIGN KEY (tenant_id, adjuster_id)
    REFERENCES claim_adjusters (tenant_id, adjuster_id),
  CONSTRAINT routed_claim_identity
    CHECK (claim_id > 0 AND jurisdiction IN ('NA', 'EU') AND stage IN ('active', 'closed')),
  CONSTRAINT routed_claim_finance
    CHECK (loss_amount >= 0 AND (reserve_amount IS NULL OR reserve_amount >= 0)),
  CONSTRAINT routed_claim_lifecycle
    CHECK (CASE stage
      WHEN 'active' THEN closed_at IS NULL AND resolution_note IS NULL
      WHEN 'closed' THEN closed_at IS NOT NULL AND resolution_note IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT routed_claim_review
    CHECK (review_note IS NULL OR adjuster_id IS NOT NULL),
  CONSTRAINT routed_claim_incident_identity
    CHECK (incident_note IS NULL OR incident_note <> intake_code),
  CONSTRAINT routed_claim_open_marker
    CHECK (stage <> 'active' OR open_marker IS NOT NULL)
) PARTITION BY LIST (jurisdiction);

CREATE TABLE routed_claims_na PARTITION OF routed_claims
  FOR VALUES IN ('NA') PARTITION BY LIST (stage);
CREATE TABLE routed_claims_na_active PARTITION OF routed_claims_na
  FOR VALUES IN ('active');
CREATE TABLE routed_claims_na_closed PARTITION OF routed_claims_na
  FOR VALUES IN ('closed');
CREATE TABLE routed_claims_eu PARTITION OF routed_claims
  FOR VALUES IN ('EU') PARTITION BY LIST (stage);
CREATE TABLE routed_claims_eu_active PARTITION OF routed_claims_eu
  FOR VALUES IN ('active');
CREATE TABLE routed_claims_eu_closed PARTITION OF routed_claims_eu
  FOR VALUES IN ('closed');

CREATE FUNCTION rewrite_active_claim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.review_note := NULL;
  IF TG_OP = 'INSERT' THEN
    NEW.resolution_note := NULL;
    NEW.closed_at := NULL;
  ELSIF NEW.intake_code = 'INT-100' THEN
    NEW.stage := 'active';
    NEW.resolution_note := NULL;
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION rewrite_closed_claim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.resolution_note := coalesce(nullif(btrim(NEW.resolution_note), ''), NEW.incident_note);
  RETURN NEW;
END $$;

CREATE TRIGGER na_active_rewrite
  BEFORE INSERT OR UPDATE ON routed_claims_na_active
  FOR EACH ROW EXECUTE FUNCTION rewrite_active_claim();
CREATE TRIGGER eu_active_rewrite
  BEFORE INSERT OR UPDATE ON routed_claims_eu_active
  FOR EACH ROW EXECUTE FUNCTION rewrite_active_claim();
CREATE TRIGGER na_closed_rewrite
  BEFORE INSERT OR UPDATE ON routed_claims_na_closed
  FOR EACH ROW EXECUTE FUNCTION rewrite_closed_claim();
CREATE TRIGGER eu_closed_rewrite
  BEFORE INSERT OR UPDATE ON routed_claims_eu_closed
  FOR EACH ROW EXECUTE FUNCTION rewrite_closed_claim();

CREATE TABLE claim_intake (
  tenant_id       int NOT NULL REFERENCES claim_tenants (tenant_id),
  intake_id       int NOT NULL,
  claim_id        int NOT NULL,
  policy_id       int NOT NULL,
  jurisdiction    text NOT NULL,
  stage           text NOT NULL,
  loss_amount     numeric NOT NULL,
  reserve_amount  numeric,
  incident_at     timestamptz NOT NULL,
  intake_code     text NOT NULL,
  incident_note   text,
  resolution_note text,
  closed_at       timestamptz,
  review_note     text,
  PRIMARY KEY (tenant_id, intake_id),
  FOREIGN KEY (tenant_id, claim_id)
    REFERENCES claim_registry (tenant_id, claim_id),
  FOREIGN KEY (tenant_id, policy_id)
    REFERENCES claim_policies (tenant_id, policy_id),
  CONSTRAINT intake_route
    CHECK (jurisdiction IN ('NA', 'EU') AND stage IN ('active', 'closed')),
  CONSTRAINT intake_finance
    CHECK (loss_amount >= 0 AND (reserve_amount IS NULL OR reserve_amount >= 0)),
  CONSTRAINT intake_resolution_state
    CHECK (resolution_note IS NULL OR incident_note IS NOT NULL),
  CONSTRAINT intake_lifecycle
    CHECK (CASE stage
      WHEN 'active' THEN closed_at IS NULL
      WHEN 'closed' THEN closed_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT intake_review_identity
    CHECK (review_note IS NULL OR review_note <> intake_code)
);

CREATE TABLE claim_transition_requests (
  tenant_id       int NOT NULL REFERENCES claim_tenants (tenant_id),
  request_id      int NOT NULL,
  claim_id        int NOT NULL,
  from_jurisdiction text NOT NULL,
  from_stage      text NOT NULL,
  to_jurisdiction text NOT NULL,
  to_stage        text NOT NULL,
  requested_at    timestamptz NOT NULL,
  closed_at       timestamptz,
  resolution_note text,
  review_note     text,
  actor_label     text,
  PRIMARY KEY (tenant_id, request_id),
  FOREIGN KEY (tenant_id, claim_id)
    REFERENCES claim_registry (tenant_id, claim_id),
  CONSTRAINT transition_route
    CHECK (from_jurisdiction IN ('NA', 'EU') AND to_jurisdiction IN ('NA', 'EU')),
  CONSTRAINT transition_stage
    CHECK (from_stage IN ('active', 'closed') AND to_stage IN ('active', 'closed')),
  CONSTRAINT transition_closure
    CHECK (CASE to_stage
      WHEN 'active' THEN closed_at IS NULL
      WHEN 'closed' THEN closed_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT transition_actor_review
    CHECK (review_note IS NULL OR actor_label IS NOT NULL)
);

CREATE TABLE claim_events (
  tenant_id        int NOT NULL REFERENCES claim_tenants (tenant_id),
  event_id         int NOT NULL,
  claim_id         int NOT NULL,
  from_jurisdiction text NOT NULL,
  from_stage       text NOT NULL,
  to_jurisdiction  text NOT NULL,
  to_stage         text NOT NULL,
  occurred_at      timestamptz NOT NULL,
  actor_label      text NOT NULL,
  previous_resolution text,
  current_resolution  text,
  transition_marker text GENERATED ALWAYS AS (
    CASE WHEN to_stage = 'closed'
      THEN NULLIF(current_resolution, 'no payout') ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, claim_id)
    REFERENCES claim_registry (tenant_id, claim_id),
  CONSTRAINT event_route
    CHECK (from_jurisdiction IN ('NA', 'EU') AND to_jurisdiction IN ('NA', 'EU')),
  CONSTRAINT event_stage
    CHECK (from_stage IN ('active', 'closed') AND to_stage IN ('active', 'closed')),
  CONSTRAINT event_resolution_state
    CHECK (CASE to_stage
      WHEN 'active' THEN current_resolution IS NULL
      WHEN 'closed' THEN current_resolution IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT event_actor_history
    CHECK (actor_label <> '' AND (previous_resolution IS NULL OR previous_resolution <> actor_label))
);
