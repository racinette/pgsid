-- name: active_principal
INSERT INTO principals (tenant_id, principal_id, display_name, email, state, enabled, created_at)
VALUES (1, 100, 'Daria Novak', NULL, 'active', true, '2026-08-02 10:00+00');
-- name: disabled_principal_without_evidence
INSERT INTO principals (tenant_id, principal_id, display_name, email, state, enabled, created_at)
VALUES (1, 100, 'Daria Novak', NULL, 'disabled', false, '2026-08-02 10:00+00');

-- name: access_group_with_owner
INSERT INTO access_groups (tenant_id, group_id, group_name, created_at, owner_principal_id) VALUES (1, 10000, 'Check Auditors', '2026-08-02 10:00+00', 10);
-- name: live_access_group_without_owner
INSERT INTO access_groups (tenant_id, group_id, group_name, created_at, owner_principal_id) VALUES (1, 10000, 'Check Auditors', '2026-08-02 10:00+00', NULL);
-- name: grant_with_revocation_note
INSERT INTO role_grants (tenant_id, grant_id, principal_id, role_name, granted_at, revoked_at, revocation_note) VALUES (1, 10000, 10, 'check-auditor', '2026-08-01 10:00+00', '2026-08-02 10:00+00', 'access review');
-- name: revoked_grant_without_note
INSERT INTO role_grants (tenant_id, grant_id, principal_id, role_name, granted_at, revoked_at, revocation_note) VALUES (1, 10000, 10, 'check-auditor', '2026-08-01 10:00+00', '2026-08-02 10:00+00', NULL);
-- name: request_without_optional_notes
INSERT INTO revocation_requests (tenant_id, request_id, grant_id, requested_by, requested_at, reason, reviewer_note) VALUES (1, 10000, 1, 10, '2026-08-02 10:00+00', NULL, NULL);
-- name: request_with_reason_only
INSERT INTO revocation_requests (tenant_id, request_id, grant_id, requested_by, requested_at, reason, reviewer_note) VALUES (1, 10000, 1, 10, '2026-08-02 10:00+00', 'access review', NULL);
-- name: request_with_reviewer_note_only
INSERT INTO revocation_requests (tenant_id, request_id, grant_id, requested_by, requested_at, reason, reviewer_note) VALUES (1, 10000, 1, 10, '2026-08-02 10:00+00', NULL, 'needs decision');
-- name: request_with_repeated_notes
INSERT INTO revocation_requests (tenant_id, request_id, grant_id, requested_by, requested_at, reason, reviewer_note) VALUES (1, 10000, 1, 10, '2026-08-02 10:00+00', 'access review', 'access review');
-- name: audit_without_detail
INSERT INTO audit_events (event_id, tenant_id, subject_principal_id, event_kind, occurred_at, actor_label, detail) VALUES (10000, 1, 10, 'grant_removed', '2026-08-02 10:00+00', 'Daria', NULL);
-- name: audit_detail_repeats_actor
INSERT INTO audit_events (event_id, tenant_id, subject_principal_id, event_kind, occurred_at, actor_label, detail) VALUES (10000, 1, 10, 'grant_removed', '2026-08-02 10:00+00', 'Daria', 'Daria');
