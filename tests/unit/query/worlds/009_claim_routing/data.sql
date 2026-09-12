INSERT INTO claim_tenants
  (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note)
VALUES
  (1, 'northstar', 'Northstar Mutual', 'NA', '2025-01-01 00:00+00', NULL, NULL),
  (2, 'harbor', 'Harbor Assurance', 'EU', '2025-02-01 00:00+00', NULL, 'multilingual desk');

INSERT INTO claim_adjusters
  (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty)
VALUES
  (1, 10, 'Ari Vale', 'CAT-NA', '2025-01-01 00:00+00', NULL, 'weather'),
  (1, 11, 'Mina Cole', 'CLOSE-NA', '2025-01-01 00:00+00', NULL, NULL),
  (2, 10, 'Ivo Marin', 'CAT-EU', '2025-02-01 00:00+00', NULL, 'motor');

INSERT INTO claim_policies
  (tenant_id, policy_id, policy_number, jurisdiction, effective_at, expires_at,
   coverage_note, lead_adjuster_id)
VALUES
  (1, 10, 'NA-HOME-10', 'NA', '2026-01-01 00:00+00', NULL, 'storm cover', 10),
  (1, 11, 'EU-TRAVEL-11', 'EU', '2026-01-01 00:00+00', NULL, NULL, 11),
  (2, 10, 'EU-MOTOR-10', 'EU', '2026-01-01 00:00+00', NULL, 'fleet cover', 10);

INSERT INTO claim_registry
  (tenant_id, claim_id, policy_id, external_ref, reported_at, claimant_note, closed_summary)
VALUES
  (1, 100, 10, 'CLM-100', '2026-08-01 09:00+00', NULL, NULL),
  (1, 101, 10, 'CLM-101', '2026-08-02 09:00+00', 'roof loss', 'paid roof loss'),
  (1, 102, 11, 'CLM-102', '2026-08-03 09:00+00', NULL, NULL),
  (1, 103, 11, 'CLM-103', '2026-08-04 09:00+00', NULL, 'closed abroad'),
  (1, 104, 10, 'CLM-104', '2026-08-05 09:00+00', 'garage damage', NULL),
  (1, 105, 10, 'CLM-105', '2026-08-06 09:00+00', NULL, NULL),
  (1, 107, 10, 'CLM-107', '2026-08-07 09:00+00', NULL, NULL),
  (1, 108, 11, 'CLM-108', '2026-08-08 09:00+00', 'hail abroad', NULL),
  (1, 109, 10, 'CLM-109', '2026-08-09 09:00+00', NULL, NULL),
  (1, 110, 10, 'CLM-110', '2026-08-10 09:00+00', NULL, NULL),
  (1, 111, 11, 'CLM-111', '2026-08-11 09:00+00', NULL, NULL),
  (1, 112, 10, 'CLM-112', '2026-08-12 09:00+00', NULL, NULL);

INSERT INTO claim_assignments
  (tenant_id, assignment_id, claim_id, adjuster_id, assigned_at, released_at, assignment_note)
VALUES
  (1, 1, 100, 10, '2026-08-01 10:00+00', NULL, 'initial review'),
  (1, 2, 101, 11, '2026-08-02 10:00+00', '2026-08-20 10:00+00', 'completed review');

INSERT INTO routed_claims
  (tenant_id, claim_id, jurisdiction, stage, policy_id, adjuster_id, loss_amount,
   reserve_amount, incident_at, intake_code, incident_note, resolution_note,
   closed_at, review_note)
VALUES
  (1, 100, 'NA', 'active', 10, 10, 1200, 900, '2026-07-30 08:00+00',
   'INT-100', 'wind damage', 'stale resolution', NULL, 'stale review'),
  (1, 101, 'NA', 'closed', 10, 11, 800, 800, '2026-07-29 08:00+00',
   'INT-101', 'roof damage', 'paid roof', '2026-08-20 10:00+00', NULL),
  (1, 102, 'EU', 'active', 11, NULL, 400, NULL, '2026-07-28 08:00+00',
   'INT-102', NULL, NULL, NULL, NULL),
  (1, 103, 'EU', 'closed', 11, 11, 500, 450, '2026-07-27 08:00+00',
   'INT-103', 'travel delay', 'no payout', '2026-08-18 10:00+00', NULL),
  (1, 104, 'NA', 'active', 10, 10, 650, 500, '2026-07-26 08:00+00',
   'INT-104', 'garage damage', NULL, NULL, NULL),
  (1, 105, 'NA', 'active', 10, 10, 700, 600, '2026-07-25 08:00+00',
   'INT-105', NULL, NULL, NULL, NULL),
  (1, 109, 'NA', 'active', 10, 10, 900, 750, '2026-07-24 08:00+00',
   'INT-109', 'no payout', NULL, NULL, NULL);

INSERT INTO claim_intake
  (tenant_id, intake_id, claim_id, policy_id, jurisdiction, stage, loss_amount,
   reserve_amount, incident_at, intake_code, incident_note, resolution_note,
   closed_at, review_note)
VALUES
  (1, 500, 107, 10, 'NA', 'active', 300, NULL, '2026-09-01 08:00+00',
   'INT-107', 'window damage', 'premature close', NULL, 'needs triage'),
  (1, 501, 108, 11, 'EU', 'closed', 250, 200, '2026-09-02 08:00+00',
   'INT-108', 'hail closure', NULL, '2026-09-03 08:00+00', NULL);

INSERT INTO claim_transition_requests
  (tenant_id, request_id, claim_id, from_jurisdiction, from_stage,
   to_jurisdiction, to_stage, requested_at, closed_at, resolution_note,
   review_note, actor_label)
VALUES
  (1, 700, 105, 'NA', 'active', 'NA', 'closed', '2026-09-05 08:00+00',
   '2026-09-05 09:00+00', 'approved payout', 'merge close', 'Mina'),
  (1, 701, 111, 'EU', 'active', 'EU', 'active', '2026-09-05 08:05+00',
   NULL, 'stale intake result', 'merge review', 'Ivo');

INSERT INTO claim_events
  (tenant_id, event_id, claim_id, from_jurisdiction, from_stage,
   to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution,
   current_resolution)
VALUES
  (1, 1, 100, 'NA', 'active', 'NA', 'active', '2026-08-01 11:00+00',
   'Ari', NULL, NULL),
  (1, 2, 102, 'EU', 'active', 'EU', 'active', '2026-08-03 11:00+00',
   'Ivo', NULL, NULL);
