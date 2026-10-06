-- name: canonical
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (100, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: braced_upper
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (101, '{0123456789ABCDEF0123456789ABCDEF}', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: four_digit_groups
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (102, '0123-4567-89ab-cdef-0123-4567-89ab-cdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: backup_selected
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (103, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', false, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: nil_identifier
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (104, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: above_ceiling
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (105, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: below_floor
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (106, '01234567-89ab-cdef-0123-456789abcdef', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: mismatched_record
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (107, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', 'ffffffff-ffff-ffff-ffff-ffffffffffff', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: mismatched_backup
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (108, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', false, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: uppercase_output
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (109, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89AB-CDEF-0123-456789ABCDEF', -254);

-- name: wrong_comparison
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (110, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', 254);

-- name: all_null
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (111, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: null_primary
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (112, NULL, '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: null_bounds
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (113, '01234567-89ab-cdef-0123-456789abcdef', NULL, NULL, '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: null_backup
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (114, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', NULL, '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: null_recorded
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (115, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', NULL, true, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: null_selection
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (116, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', NULL, '01234567-89ab-cdef-0123-456789abcdef', -254);

-- name: null_output
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (117, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, NULL, -254);

-- name: null_comparison
INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison) VALUES (118, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', NULL);

-- name: import_canonical
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (119, '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_braced
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (120, '{0123456789ABCDEF0123456789ABCDEF}', '0123-4567-89ab-cdef-0123-4567-89ab-cdef', '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_mismatch
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (121, '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', false);

-- name: import_null
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (122, NULL, NULL, NULL, NULL);

-- name: import_null_recorded
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (123, '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', NULL, false);

-- name: import_null_text
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (124, NULL, NULL, '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_skip
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (125, '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true);

-- name: import_error
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (126, 'not-a-uuid', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_legacy_error
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (127, '01234567-89ab-cdef-0123-456789abcdef', 'not-a-uuid', '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_skip_error
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (128, 'not-a-uuid', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true);

-- name: import_leading_space
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (129, ' 01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_trailing_hyphen
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (130, '01234567-89ab-cdef-0123-456789abcdef-', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', false);

-- name: import_default_error
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import) VALUES (131, 'not-a-uuid', NULL, NULL, true);
