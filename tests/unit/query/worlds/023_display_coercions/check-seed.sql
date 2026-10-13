-- name: enabled_flag_uses_full_true_label
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, true, 'true', 'true', 'true', true);
-- name: disabled_flag_truncates_short_label
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, false, 'fals', 'false', 'false', true);
-- name: unknown_flag_keeps_null_labels
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, NULL, NULL, NULL, NULL, true);
-- name: null_selection_uses_false_fallback
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, NULL, NULL, NULL, 'false', NULL);
-- name: enabled_flag_has_wrong_short_label
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, true, 'true!', 'true', 'true', true);
-- name: disabled_flag_short_label_is_not_truncated
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, false, 'false', 'false', 'false', true);
-- name: flag_audit_text_has_extra_space
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, true, 'true', 'true ', 'true', true);
-- name: flag_selection_uses_wrong_branch
INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current) VALUES (2, true, 'true', 'true', 'false', true);

-- name: endpoint_formats_and_shifts_address
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, '10.1.2.3', '10.1.2.3', '10.1.2.3/32', 1, '10.1.2.4/3', false);
-- name: endpoint_keeps_null_address_labels
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, NULL, NULL, NULL, 1, NULL, false);
-- name: endpoint_has_wrong_short_label
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, '10.1.2.3', '10.1.2.', '10.1.2.3/32', 1, '10.1.2.4/3', false);
-- name: endpoint_audit_label_omits_prefix
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, '10.1.2.3', '10.1.2.3', '10.1.2.3', 1, '10.1.2.4/3', false);
-- name: endpoint_shifted_label_has_wrong_address
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, '10.1.2.3', '10.1.2.3', '10.1.2.3/32', 1, '10.1.2.3/3', false);
-- name: endpoint_shift_reaches_overflow
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, '255.255.255.255', '255.255.', '255.255.255.255/32', 1, NULL, false);
-- name: endpoint_shift_skips_overflow
INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift) VALUES (2, 1, '255.255.255.255', '255.255.', '255.255.255.255/32', 1, 'not evaluated', true);

-- name: scope_formats_network_prefix
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, '192.0.2.0/24', '192.0.2.0/24', '192.0.2.0/24', '10.0.0.0/8', true, '192.0.2.0/');
-- name: scope_selection_uses_backup
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, '192.0.2.0/24', '192.0.2.0/24', '192.0.2.0/24', '10.0.0.0/8', false, '10.0.0.0/8');
-- name: null_scope_selection_uses_backup
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, NULL, NULL, NULL, '10.0.0.0/8', NULL, '10.0.0.0/8');
-- name: null_primary_scope_keeps_null_selected_label
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, NULL, NULL, NULL, '10.0.0.0/8', true, NULL);
-- name: scope_display_label_omits_prefix
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, '192.0.2.0/24', '192.0.2.0', '192.0.2.0/24', '10.0.0.0/8', true, '192.0.2.0/');
-- name: scope_preview_label_loses_suffix
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, '192.0.2.0/24', '192.0.2.0/24', '192.0.2.0/', '10.0.0.0/8', true, '192.0.2.0/');
-- name: scope_selected_label_uses_wrong_branch
INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label) VALUES (2, 1, '192.0.2.0/24', '192.0.2.0/24', '192.0.2.0/24', '10.0.0.0/8', true, '10.0.0.0/8');
