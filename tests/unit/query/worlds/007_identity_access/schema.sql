-- A tenant-scoped identity lifecycle. Principals receive roles directly and
-- through groups; revocation requests authorize removals, and audit events
-- preserve the evidence after mutable access rows disappear.

CREATE TYPE principal_state AS ENUM ('active', 'disabled');
CREATE TYPE audit_kind AS ENUM ('grant_removed', 'membership_expired', 'identity_disabled');

CREATE TABLE tenants (
  id            int PRIMARY KEY,
  tenant_slug   text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  created_at    timestamptz NOT NULL,
  suspended_at  timestamptz,
  support_note  text,
  CONSTRAINT tenant_identity_present
    CHECK (tenant_slug <> '' AND display_name <> ''),
  CONSTRAINT tenant_suspension_chronology
    CHECK (suspended_at IS NULL OR suspended_at >= created_at),
  CONSTRAINT tenant_note_distinct
    CHECK (support_note IS NULL OR support_note <> tenant_slug)
);

CREATE TABLE principals (
  tenant_id       int NOT NULL REFERENCES tenants (id),
  principal_id    int NOT NULL,
  display_name    text NOT NULL,
  email           text,
  state           principal_state NOT NULL,
  enabled         boolean NOT NULL,
  created_at      timestamptz NOT NULL,
  disabled_at     timestamptz,
  disabled_reason text,
  review_note     text,
  lifecycle_marker text GENERATED ALWAYS AS (
    CASE WHEN disabled_at IS NULL THEN NULL ELSE display_name END
  ) STORED,
  PRIMARY KEY (tenant_id, principal_id),
  CONSTRAINT principal_identity_present
    CHECK (display_name <> '' AND (email IS NULL OR email <> '')),
  CONSTRAINT principal_state_evidence
    CHECK (CASE state
      WHEN 'active' THEN enabled AND disabled_at IS NULL AND disabled_reason IS NULL
      WHEN 'disabled' THEN NOT enabled AND disabled_at IS NOT NULL AND disabled_reason IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT principal_disable_chronology
    CHECK (disabled_at IS NULL OR disabled_at >= created_at),
  CONSTRAINT principal_notes_distinct
    CHECK (review_note IS NULL OR disabled_reason IS NULL OR review_note <> disabled_reason)
);

CREATE TABLE access_groups (
  tenant_id          int NOT NULL REFERENCES tenants (id),
  group_id           int NOT NULL,
  group_name         text NOT NULL,
  created_at         timestamptz NOT NULL,
  retired_at         timestamptz,
  owner_principal_id int,
  description        text,
  PRIMARY KEY (tenant_id, group_id),
  FOREIGN KEY (tenant_id, owner_principal_id)
    REFERENCES principals (tenant_id, principal_id),
  CONSTRAINT group_identity_present
    CHECK (group_name <> '' AND (description IS NULL OR description <> '')),
  CONSTRAINT group_retirement_chronology
    CHECK (retired_at IS NULL OR retired_at >= created_at),
  CONSTRAINT group_owner_or_retired
    CHECK (owner_principal_id IS NOT NULL OR retired_at IS NOT NULL)
);

CREATE TABLE group_memberships (
  tenant_id    int NOT NULL,
  group_id     int NOT NULL,
  principal_id int NOT NULL,
  granted_at   timestamptz NOT NULL,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  source_note  text,
  active_marker int GENERATED ALWAYS AS (
    CASE WHEN revoked_at IS NULL THEN principal_id ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, group_id, principal_id),
  FOREIGN KEY (tenant_id, group_id)
    REFERENCES access_groups (tenant_id, group_id),
  FOREIGN KEY (tenant_id, principal_id)
    REFERENCES principals (tenant_id, principal_id),
  CONSTRAINT membership_window
    CHECK (expires_at IS NULL OR expires_at >= granted_at),
  CONSTRAINT membership_revocation_chronology
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at),
  CONSTRAINT membership_endpoints_exclusive
    CHECK (expires_at IS NULL OR revoked_at IS NULL),
  CONSTRAINT membership_note_distinct
    CHECK (source_note IS NULL OR source_note <> principal_id::text)
);

CREATE TABLE role_grants (
  tenant_id       int NOT NULL,
  grant_id        int NOT NULL,
  principal_id    int NOT NULL,
  role_name       text NOT NULL,
  granted_at      timestamptz NOT NULL,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  revocation_note text,
  grant_marker text GENERATED ALWAYS AS (
    CASE WHEN revoked_at IS NULL THEN role_name ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, grant_id),
  UNIQUE (tenant_id, principal_id, role_name),
  FOREIGN KEY (tenant_id, principal_id)
    REFERENCES principals (tenant_id, principal_id),
  CONSTRAINT grant_identity_present
    CHECK (role_name <> '' AND (revocation_note IS NULL OR revocation_note <> '')),
  CONSTRAINT grant_expiry_chronology
    CHECK (expires_at IS NULL OR expires_at >= granted_at),
  CONSTRAINT grant_revocation_chronology
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at),
  CONSTRAINT grant_revocation_evidence
    CHECK (revoked_at IS NULL OR revocation_note IS NOT NULL)
);

CREATE TABLE revocation_requests (
  tenant_id    int NOT NULL,
  request_id   int NOT NULL,
  grant_id     int NOT NULL,
  requested_by int NOT NULL,
  requested_at timestamptz NOT NULL,
  approved_at  timestamptz,
  reason       text,
  reviewer_note text,
  PRIMARY KEY (tenant_id, request_id),
  FOREIGN KEY (tenant_id, requested_by)
    REFERENCES principals (tenant_id, principal_id),
  CONSTRAINT request_approval_chronology
    CHECK (approved_at IS NULL OR approved_at >= requested_at),
  CONSTRAINT request_approval_evidence
    CHECK (approved_at IS NULL OR reason IS NOT NULL),
  CONSTRAINT request_notes_distinct
    CHECK (reviewer_note IS NULL OR reason IS NULL OR reviewer_note <> reason)
);

CREATE TABLE audit_events (
  event_id             int PRIMARY KEY,
  tenant_id            int NOT NULL,
  subject_principal_id int NOT NULL,
  event_kind           audit_kind NOT NULL,
  occurred_at          timestamptz NOT NULL,
  actor_label          text NOT NULL,
  detail               text,
  previous_expiry      timestamptz,
  classification text GENERATED ALWAYS AS (
    CASE
      WHEN event_kind = 'grant_removed' THEN actor_label
      WHEN event_kind = 'membership_expired' THEN coalesce(detail, actor_label)
      ELSE NULL
    END
  ) STORED,
  FOREIGN KEY (tenant_id, subject_principal_id)
    REFERENCES principals (tenant_id, principal_id),
  CONSTRAINT audit_actor_present
    CHECK (actor_label <> '' AND (detail IS NULL OR detail <> '')),
  CONSTRAINT audit_expiry_by_kind
    CHECK (CASE event_kind
      WHEN 'grant_removed' THEN previous_expiry IS NULL
      WHEN 'membership_expired' THEN previous_expiry IS NOT NULL
      WHEN 'identity_disabled' THEN previous_expiry IS NULL
      ELSE NULL
    END),
  CONSTRAINT audit_detail_distinct
    CHECK (detail IS NULL OR detail <> actor_label)
);
