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
