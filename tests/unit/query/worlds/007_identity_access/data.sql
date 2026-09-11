-- Tenant 1 has direct and group-derived access in several lifecycle states.
-- Tenant 2 reuses principal identifiers so partial tenant correlations are
-- observably unsafe. The rows also leave one principal and one retired group
-- without current access, and preserve both present and absent removal arms.

INSERT INTO tenants
  (id, tenant_slug, display_name, created_at, suspended_at, support_note)
VALUES
  (1, 'north-lab', 'North Laboratory', '2026-01-01 08:00+00', NULL, NULL),
  (2, 'south-lab', 'South Laboratory', '2026-01-02 08:00+00', NULL, 'regional tenant');

INSERT INTO principals
  (tenant_id, principal_id, display_name, email, state, enabled, created_at,
   disabled_at, disabled_reason, review_note)
VALUES
  (1, 10, 'Ada Operator', 'ada@north.test', 'active', true, '2026-01-03 08:00+00', NULL, NULL, NULL),
  (1, 11, 'Boris Service', NULL, 'active', true, '2026-01-03 09:00+00', NULL, NULL, 'automation'),
  (1, 12, 'Chen Former', 'chen@north.test', 'disabled', false, '2026-01-03 10:00+00',
   '2026-08-01 12:00+00', 'employment ended', NULL),
  (1, 13, 'Elena Observer', NULL, 'active', true, '2026-01-03 11:00+00', NULL, NULL, NULL),
  (2, 10, 'Daria South', 'daria@south.test', 'active', true, '2026-01-04 08:00+00', NULL, NULL, NULL);

INSERT INTO access_groups
  (tenant_id, group_id, group_name, created_at, retired_at,
   owner_principal_id, description)
VALUES
  (1, 100, 'operators', '2026-02-01 08:00+00', NULL, 10, 'console operators'),
  (1, 101, 'legacy-reviewers', '2026-02-01 09:00+00', '2026-07-01 09:00+00', NULL, NULL),
  (2, 100, 'south-operators', '2026-02-02 08:00+00', NULL, 10, NULL);

INSERT INTO group_memberships
  (tenant_id, group_id, principal_id, granted_at, expires_at, revoked_at, source_note)
VALUES
  (1, 100, 10, '2026-03-01 08:00+00', NULL, NULL, 'team assignment'),
  (1, 100, 11, '2026-03-01 09:00+00', '2026-12-31 23:00+00', NULL, NULL),
  (1, 101, 12, '2026-03-01 10:00+00', '2026-07-15 10:00+00', NULL, 'legacy cleanup'),
  (2, 100, 10, '2026-03-02 08:00+00', NULL, NULL, NULL);

INSERT INTO role_grants
  (tenant_id, grant_id, principal_id, role_name, granted_at, expires_at,
   revoked_at, revocation_note)
VALUES
  (1, 200, 10, 'tenant_admin', '2026-04-01 08:00+00', NULL, NULL, NULL),
  (1, 201, 11, 'deploy', '2026-04-01 09:00+00', '2026-12-31 23:00+00', NULL, NULL),
  (1, 202, 12, 'review', '2026-04-01 10:00+00', NULL,
   '2026-08-01 11:00+00', 'approved offboarding'),
  (1, 203, 10, 'billing', '2026-04-02 08:00+00', NULL,
   '2026-08-02 11:00+00', 'role consolidated'),
  (2, 200, 10, 'tenant_admin', '2026-04-03 08:00+00', NULL, NULL, NULL);

INSERT INTO revocation_requests
  (tenant_id, request_id, grant_id, requested_by, requested_at, approved_at,
   reason, reviewer_note)
VALUES
  (1, 300, 202, 10, '2026-08-01 10:00+00', '2026-08-01 10:30+00',
   'offboarding', NULL),
  (1, 301, 203, 10, '2026-08-02 10:00+00', '2026-08-02 10:30+00',
   'role consolidation', 'security approved'),
  (1, 302, 201, 10, '2026-08-03 10:00+00', NULL, NULL, NULL),
  (2, 300, 200, 10, '2026-08-04 10:00+00', NULL, NULL, NULL);

INSERT INTO audit_events
  (event_id, tenant_id, subject_principal_id, event_kind, occurred_at,
   actor_label, detail, previous_expiry)
VALUES
  (1, 1, 12, 'identity_disabled', '2026-08-01 12:00+00',
   'identity service', 'employment ended', NULL),
  (2, 1, 12, 'membership_expired', '2026-07-15 10:05+00',
   'lifecycle worker', NULL, '2026-07-15 10:00+00'),
  (3, 1, 12, 'grant_removed', '2026-08-01 11:05+00',
   'security desk', 'approved offboarding', NULL);
