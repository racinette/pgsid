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

-- name: fingerprint_canonical
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (300, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_braced
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (301, '{0123456789AB4DEF8123456789ABCDEF}', '0123-4567-89ab-4def-8123-4567-89ab-cdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_nil
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (302, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 0, '\x00000000000000000000000000000000', 1353656403, -6859010066814654381, -6859010066814654381, NULL, false);

-- name: fingerprint_full
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (303, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ffffffff-ffff-ffff-ffff-ffffffffffff', -1, '\xffffffffffffffffffffffffffffffff', -682383255, 2453606995437744319, 293445543803463785, NULL, false);

-- name: fingerprint_version_one
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (304, 'ffffffff-ffff-1fff-bfff-ffffffffffff', 'ffffffff-ffff-1fff-bfff-ffffffffffff', 9223372036854775807, '\xffffffffffff1fffbfffffffffffffff', 1387214855, 7592062959901531867, 5731938680318146567, 1, false);

-- name: fingerprint_version_seven
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (305, '01234567-89ab-7def-8123-456789abcdef', '01234567-89ab-7def-8123-456789abcdef', -9223372036854775808, '\x0123456789ab7def8123456789abcdef', 1765559324, -1568393217911142074, -8320587252547957732, 7, false);

-- name: fingerprint_version_zero
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (306, '01234567-89ab-0def-8123-456789abcdef', '01234567-89ab-0def-8123-456789abcdef', 4294967296, '\x0123456789ab0def8123456789abcdef', 1698004675, 3683723525065523539, 8187313621952724675, 0, false);

-- name: fingerprint_version_fifteen
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (307, '01234567-89ab-fdef-8123-456789abcdef', '01234567-89ab-fdef-8123-456789abcdef', -4294967297, '\x0123456789abfdef8123456789abcdef', -102999968, 2930429821717244986, -8428554747893753760, 15, false);

-- name: fingerprint_wrong_wire
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (308, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x', 1980659289, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_wrong_hash
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (309, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 0, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_wrong_seed
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (310, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, 0, -8882000122858277287, 4, false);

-- name: fingerprint_wrong_zero
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (311, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, 0, 4, false);

-- name: fingerprint_wrong_version
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (312, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 7, false);

-- name: fingerprint_null_version
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (313, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, NULL, false);

-- name: fingerprint_invalid_variant_claim
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (314, '01234567-89ab-4def-c123-456789abcdef', '01234567-89ab-4def-c123-456789abcdef', 1, '\x0123456789ab4defc123456789abcdef', 1833366618, -5694973404008859628, -4031740667129039782, 4, false);

-- name: fingerprint_null
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (315, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);

-- name: fingerprint_null_seed
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (316, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', NULL, '\x0123456789ab4def8123456789abcdef', 1980659289, NULL, -8882000122858277287, 4, false);

-- name: fingerprint_null_wire
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (317, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, NULL, 1980659289, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_null_hash
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (318, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', NULL, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_null_seeded
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (319, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, NULL, -8882000122858277287, 4, false);

-- name: fingerprint_null_zero
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (320, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, NULL, 4, false);

-- name: fingerprint_error
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (321, '01234567-89ab-4def-8123-456789abcdef', 'not-a-uuid', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 4, false);

-- name: fingerprint_skip_error
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (322, '01234567-89ab-4def-8123-456789abcdef', 'not-a-uuid', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 4, true);

-- name: fingerprint_skip
INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (323, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 4, true);

-- name: event_gregorian_epoch
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (400, '00000000-0000-1000-8000-000000000000', '00000000-0000-1000-8000-000000000000', '1582-10-15 00:00:00+00', '-infinity', 'infinity', false, false);

-- name: event_v1_unix_epoch
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (401, '13814000-1dd2-11b2-8000-000000000000', '13814000-1dd2-11b2-8000-000000000000', '1970-01-01 00:00:00+00', '1970-01-01 00:00:00+00', '1970-01-01 00:00:00+00', true, false);

-- name: event_v1_before_postgres_epoch
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (402, '63afffff-bfde-11d3-8000-000000000000', '63afffff-bfde-11d3-8000-000000000000', '1999-12-31 23:59:59.999999+00', '-infinity', '2000-01-01 00:00:00+00', false, false);

-- name: event_v1_submicrosecond_truncation
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (403, '63b00009-bfde-11d3-8000-000000000000', '{63B00009BFDE11D38000000000000000}', '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', false, false);

-- name: event_v1_next_microsecond
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (404, '63b0000a-bfde-11d3-8000-000000000000', '63b0000a-bfde-11d3-8000-000000000000', '2000-01-01 00:00:00.000001+00', '2000-01-01 00:00:00+00', '2000-01-01 00:00:00.000001+00', false, false);

-- name: event_v1_maximum
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (405, 'ffffffff-ffff-1fff-bfff-ffffffffffff', 'ffffffff-ffff-1fff-bfff-ffffffffffff', '5236-03-31 21:21:00.684697+00', '-infinity', 'infinity', false, false);

-- name: event_v7_unix_epoch
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (406, '00000000-0000-7000-8000-000000000000', '00000000-0000-7000-8000-000000000000', '1970-01-01 00:00:00+00', '-infinity', 'infinity', false, false);

-- name: event_v7_before_postgres_epoch
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (407, '00dc6acf-abff-7000-8000-000000000000', '00dc6acf-abff-7000-8000-000000000000', '1999-12-31 23:59:59.999+00', '-infinity', '2000-01-01 00:00:00+00', false, false);

-- name: event_v7_postgres_epoch
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (408, '00dc6acf-ac00-7fff-bfff-ffffffffffff', '00dc6acf-ac00-7000-8000-000000000000', '2000-01-01 01:00:00+01', '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', false, false);

-- name: event_v7_next_millisecond
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (409, '00dc6acf-ac01-7000-8000-000000000000', '00dc6acf-ac01-7000-8000-000000000000', '2000-01-01 00:00:00.001+00', '2000-01-01 00:00:00+00', 'infinity', false, false);

-- name: event_v7_maximum
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (410, 'ffffffff-ffff-7fff-bfff-ffffffffffff', 'ffffffff-ffff-7fff-bfff-ffffffffffff', '10889-08-02 05:31:50.655+00', '-infinity', 'infinity', false, false);

-- name: event_non_temporal_version
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (411, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', NULL, '-infinity', 'infinity', false, false);

-- name: event_invalid_variant
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (412, '00dc6acf-ac00-7000-c000-000000000000', '00dc6acf-ac00-7000-c000-000000000000', NULL, '-infinity', 'infinity', false, false);

-- name: event_null_identifier
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (413, NULL, NULL, NULL, NULL, NULL, false, false);

-- name: event_wrong_recorded_timestamp
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (414, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac00-7000-8000-000000000000', '2000-01-01 00:00:00.000001+00', '-infinity', 'infinity', false, false);

-- name: event_missing_recorded_timestamp
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (415, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac00-7000-8000-000000000000', NULL, '-infinity', 'infinity', false, false);

-- name: event_non_temporal_claims_timestamp
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (416, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', '2000-01-01 00:00:00+00', '-infinity', 'infinity', false, false);

-- name: event_before_window
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (417, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac00-7000-8000-000000000000', '2000-01-01 00:00:00+00', '2000-01-01 00:00:00.000001+00', 'infinity', false, false);

-- name: event_after_window
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (418, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac00-7000-8000-000000000000', '2000-01-01 00:00:00+00', '-infinity', '1999-12-31 23:59:59.999999+00', false, false);

-- name: event_null_window
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (419, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac00-7000-8000-000000000000', '2000-01-01 00:00:00+00', NULL, NULL, true, false);

-- name: event_wrong_parsed_timestamp
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (420, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac01-7000-8000-000000000000', '2000-01-01 00:00:00+00', '-infinity', 'infinity', false, false);

-- name: event_malformed_uuid_error
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (421, '00dc6acf-ac00-7000-8000-000000000000', 'not-a-uuid', '2000-01-01 00:00:00+00', '-infinity', 'infinity', false, false);

-- name: event_lazy_parse_skips_malformed_uuid
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (422, '00dc6acf-ac00-7000-8000-000000000000', 'not-a-uuid', '2000-01-01 00:00:00+00', '-infinity', 'infinity', true, true);

-- name: event_lazy_parse_skips_wrong_timestamp
INSERT INTO identifier_events (id, identifier, raw_identifier, recorded_at, floor_at, ceiling_at, prefer_recorded, skip_parse)
VALUES (423, '00dc6acf-ac00-7000-8000-000000000000', '00dc6acf-ac01-7000-8000-000000000000', '2000-01-01 00:00:00+00', '-infinity', 'infinity', true, true);
