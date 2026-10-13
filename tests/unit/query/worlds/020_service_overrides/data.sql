INSERT INTO service_efficiency_samples (id, completed_jobs, duration_seconds, jobs_per_second_limit, review_waived)
VALUES (1, 12, 4, 5, false), (2, NULL, 0, 5, false);
INSERT INTO contact_label_rules (id, display_label, placeholder_label, fallback_label, label_required)
VALUES (1, 'Dispatch', 'Unassigned', NULL, true), (2, NULL, 'Unassigned', 'Support', false);
INSERT INTO network_route_overrides (id, previous_route, next_route, override_route)
VALUES (1, '192.0.2.0/24', '192.0.2.0/24', NULL);
