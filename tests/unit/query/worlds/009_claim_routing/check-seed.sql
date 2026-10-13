-- name: registry_with_positive_policy
INSERT INTO claim_registry (tenant_id, claim_id, policy_id, external_ref, reported_at)
VALUES (1, 10000, 10, 'EXT-CHECK', '2026-08-02 10:00+00');
-- name: registry_with_zero_policy
INSERT INTO claim_registry (tenant_id, claim_id, policy_id, external_ref, reported_at)
VALUES (1, 10000, 0, 'EXT-CHECK', '2026-08-02 10:00+00');

-- name: intake_without_resolution
INSERT INTO claim_intake (tenant_id, intake_id, claim_id, policy_id, jurisdiction, stage, loss_amount, incident_at, intake_code, incident_note, resolution_note) VALUES (1, 10000, 100, 10, 'NA', 'active', 1, '2026-08-02 10:00+00', 'INT-CHECK', NULL, NULL);
-- name: intake_resolution_without_incident_note
INSERT INTO claim_intake (tenant_id, intake_id, claim_id, policy_id, jurisdiction, stage, loss_amount, incident_at, intake_code, incident_note, resolution_note) VALUES (1, 10000, 100, 10, 'NA', 'active', 1, '2026-08-02 10:00+00', 'INT-CHECK', NULL, 'paid claim');
-- name: intake_resolution_with_incident_note
INSERT INTO claim_intake (tenant_id, intake_id, claim_id, policy_id, jurisdiction, stage, loss_amount, incident_at, intake_code, incident_note, resolution_note) VALUES (1, 10000, 100, 10, 'NA', 'active', 1, '2026-08-02 10:00+00', 'INT-CHECK', 'roof damage', 'paid claim');
-- name: intake_incident_note_without_resolution
INSERT INTO claim_intake (tenant_id, intake_id, claim_id, policy_id, jurisdiction, stage, loss_amount, incident_at, intake_code, incident_note, resolution_note) VALUES (1, 10000, 100, 10, 'NA', 'active', 1, '2026-08-02 10:00+00', 'INT-CHECK', 'roof damage', NULL);
-- name: transition_without_review_note
INSERT INTO claim_transition_requests (tenant_id, request_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, requested_at, review_note, actor_label) VALUES (1, 10000, 100, 'NA', 'active', 'NA', 'active', '2026-08-02 10:00+00', NULL, NULL);
-- name: transition_review_without_actor
INSERT INTO claim_transition_requests (tenant_id, request_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, requested_at, review_note, actor_label) VALUES (1, 10000, 100, 'NA', 'active', 'NA', 'active', '2026-08-02 10:00+00', 'needs approval', NULL);
-- name: transition_review_with_actor
INSERT INTO claim_transition_requests (tenant_id, request_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, requested_at, review_note, actor_label) VALUES (1, 10000, 100, 'NA', 'active', 'NA', 'active', '2026-08-02 10:00+00', 'needs approval', 'Daria');
-- name: registry_with_repeated_summaries
INSERT INTO claim_registry (tenant_id, claim_id, policy_id, external_ref, reported_at, claimant_note, closed_summary) VALUES (1, 10000, 10, 'EXT-CHECK', '2026-08-02 10:00+00', 'paid claim', 'paid claim');
-- name: registry_with_distinct_summaries
INSERT INTO claim_registry (tenant_id, claim_id, policy_id, external_ref, reported_at, claimant_note, closed_summary) VALUES (1, 10000, 10, 'EXT-CHECK', '2026-08-02 10:00+00', 'roof damage', 'paid claim');
-- name: policy_with_unsupported_jurisdiction
INSERT INTO claim_policies (tenant_id, policy_id, policy_number, jurisdiction, effective_at) VALUES (1, 10000, 'POL-CHECK', 'APAC', '2026-08-02 10:00+00');

-- name: claim_tenant_with_identity
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, 'check-mutual', 'Check Mutual', 'NA', '2026-01-01 08:00+00', NULL, NULL);

-- name: claim_tenant_inactive_at_opening
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, 'check-mutual', 'Check Mutual', 'NA', '2026-01-01 08:00+00', '2026-01-01 08:00+00', 'claims desk');

-- name: claim_tenant_without_code
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, '', 'Check Mutual', 'NA', '2026-01-01 08:00+00', NULL, NULL);

-- name: claim_tenant_without_legal_name
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, 'check-mutual', '', 'NA', '2026-01-01 08:00+00', NULL, NULL);

-- name: claim_tenant_without_region
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, 'check-mutual', 'Check Mutual', '', '2026-01-01 08:00+00', NULL, NULL);

-- name: claim_tenant_note_repeats_code
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, 'check-mutual', 'Check Mutual', 'NA', '2026-01-01 08:00+00', NULL, 'check-mutual');

-- name: claim_tenant_inactive_before_opening
INSERT INTO claim_tenants (tenant_id, tenant_code, legal_name, home_region, opened_at, inactive_at, support_note) VALUES (10000, 'check-mutual', 'Check Mutual', 'NA', '2026-01-01 08:00+00', '2026-01-01 07:59:59.999999+00', NULL);

-- name: adjuster_with_identity
INSERT INTO claim_adjusters (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty) VALUES (1, 10000, 'Check Adjuster', 'CHECK-TEAM', '2026-01-01 08:00+00', NULL, NULL);

-- name: adjuster_inactive_at_service_start
INSERT INTO claim_adjusters (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty) VALUES (1, 10000, 'Check Adjuster', 'CHECK-TEAM', '2026-01-01 08:00+00', '2026-01-01 08:00+00', 'weather');

-- name: adjuster_without_display_name
INSERT INTO claim_adjusters (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty) VALUES (1, 10000, '', 'CHECK-TEAM', '2026-01-01 08:00+00', NULL, NULL);

-- name: adjuster_without_team_code
INSERT INTO claim_adjusters (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty) VALUES (1, 10000, 'Check Adjuster', '', '2026-01-01 08:00+00', NULL, NULL);

-- name: adjuster_specialty_repeats_team
INSERT INTO claim_adjusters (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty) VALUES (1, 10000, 'Check Adjuster', 'CHECK-TEAM', '2026-01-01 08:00+00', NULL, 'CHECK-TEAM');

-- name: adjuster_inactive_before_service_start
INSERT INTO claim_adjusters (tenant_id, adjuster_id, display_name, team_code, active_from, inactive_at, specialty) VALUES (1, 10000, 'Check Adjuster', 'CHECK-TEAM', '2026-01-01 08:00+00', '2026-01-01 07:59:59.999999+00', NULL);

-- name: assignment_open_without_note
INSERT INTO claim_assignments (tenant_id, assignment_id, claim_id, adjuster_id, assigned_at, released_at, assignment_note) VALUES (1, 10000, 100, 10, '2026-08-01 10:00+00', NULL, NULL);

-- name: assignment_open_with_note
INSERT INTO claim_assignments (tenant_id, assignment_id, claim_id, adjuster_id, assigned_at, released_at, assignment_note) VALUES (1, 10000, 100, 10, '2026-08-01 10:00+00', NULL, 'initial review');

-- name: assignment_released_at_assignment
INSERT INTO claim_assignments (tenant_id, assignment_id, claim_id, adjuster_id, assigned_at, released_at, assignment_note) VALUES (1, 10000, 100, 10, '2026-08-01 10:00+00', '2026-08-01 10:00+00', NULL);

-- name: assignment_released_before_assignment
INSERT INTO claim_assignments (tenant_id, assignment_id, claim_id, adjuster_id, assigned_at, released_at, assignment_note) VALUES (1, 10000, 100, 10, '2026-08-01 10:00+00', '2026-08-01 09:59:59.999999+00', NULL);

-- name: event_moves_an_active_claim
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'active', '2026-08-01 11:00+00', 'Check Adjuster', NULL, NULL);

-- name: event_closes_claim_with_resolution
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'closed', '2026-08-01 11:00+00', 'Check Adjuster', 'review pending', 'paid roof');

-- name: event_from_unknown_jurisdiction
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'APAC', 'active', 'EU', 'active', '2026-08-01 11:00+00', 'Check Adjuster', NULL, NULL);

-- name: event_to_unknown_jurisdiction
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'APAC', 'active', '2026-08-01 11:00+00', 'Check Adjuster', NULL, NULL);

-- name: event_from_unknown_stage
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'pending', 'EU', 'active', '2026-08-01 11:00+00', 'Check Adjuster', NULL, NULL);

-- name: event_to_unknown_stage
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'pending', '2026-08-01 11:00+00', 'Check Adjuster', NULL, NULL);

-- name: event_active_with_resolution
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'active', '2026-08-01 11:00+00', 'Check Adjuster', NULL, 'paid roof');

-- name: event_closed_without_resolution
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'closed', '2026-08-01 11:00+00', 'Check Adjuster', NULL, NULL);

-- name: event_without_actor
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'active', '2026-08-01 11:00+00', '', NULL, NULL);

-- name: event_previous_resolution_repeats_actor
INSERT INTO claim_events (tenant_id, event_id, claim_id, from_jurisdiction, from_stage, to_jurisdiction, to_stage, occurred_at, actor_label, previous_resolution, current_resolution) VALUES (1, 10000, 100, 'NA', 'active', 'EU', 'active', '2026-08-01 11:00+00', 'Check Adjuster', 'Check Adjuster', NULL);
