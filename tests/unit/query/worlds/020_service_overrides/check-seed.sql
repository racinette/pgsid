-- name: measured_rate_within_limit
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, 12, 4, 3, false);
-- name: measured_rate_exceeds_limit
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, 16, 4, 3, false);
-- name: zero_duration_skips_division
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, 12, 0, 3, false);
-- name: missing_duration_has_no_measured_rate
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, 12, NULL, 3, false);
-- name: missing_job_count_has_no_measured_rate
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, NULL, 4, 3, false);
-- name: measured_rate_preserves_division_overflow
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, -2147483648, -1, 3, false);
-- name: waiver_skips_division_overflow
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, -2147483648, -1, 3, true);
-- name: zero_duration_at_integer_boundary
INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (10, -2147483648, 0, 3, false);

-- name: required_label_is_supplied
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, 'Dispatch', 'Unassigned', NULL, true);
-- name: placeholder_is_not_a_required_label
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, 'Unassigned', 'Unassigned', 'Support', true);
-- name: absent_required_label_is_rejected
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, NULL, 'Unassigned', 'Support', true);
-- name: optional_placeholder_uses_fallback
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, 'Unassigned', 'Unassigned', 'Support', false);
-- name: empty_fallback_is_rejected
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, 'Unassigned', 'Unassigned', '', false);
-- name: empty_label_uses_fallback
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, '', '', 'Support', false);
-- name: missing_optional_label_is_allowed
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, NULL, 'Unassigned', NULL, false);
-- name: real_label_skips_empty_fallback
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (10, 'Dispatch', 'Unassigned', '', true);

-- name: unchanged_route_needs_no_override
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, '192.0.2.0/24', '192.0.2.0/24', NULL);
-- name: changed_route_records_previous_prefix
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, '192.0.2.0/24', '192.0.2.0/32', '192.0.2.0/24');
-- name: changed_route_without_override_is_rejected
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, '192.0.2.0/24', '192.0.2.0/32', NULL);
-- name: unchanged_route_with_override_is_rejected
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, '192.0.2.0/24', '192.0.2.0/24', '192.0.2.0/24');
-- name: absent_previous_route_needs_no_override
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, NULL, '192.0.2.0/24', NULL);
-- name: absent_next_route_records_previous
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, '192.0.2.0/24', NULL, '192.0.2.0/24');
-- name: both_routes_absent_need_no_override
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (10, NULL, NULL, NULL);
