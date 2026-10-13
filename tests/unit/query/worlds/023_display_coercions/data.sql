INSERT INTO display_flags (id, enabled, short_label, audit_label, fallback_label, prefer_current)
VALUES (1, true, 'true', 'true', 'true', true);

INSERT INTO network_endpoints (id, flag_id, address, short_label, audit_label, address_shift, shifted_label, skip_shift)
VALUES (1, 1, NULL, NULL, NULL, NULL, NULL, false);

INSERT INTO network_scopes (id, flag_id, scope, display_label, preview_label, backup_scope, prefer_primary, selected_label)
VALUES (1, 1, NULL, NULL, NULL, NULL, true, NULL);
