INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison)
VALUES (1, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import)
VALUES (1, '{0123456789ABCDEF0123456789ABCDEF}', '0123-4567-89ab-cdef-0123-4567-89ab-cdef', '01234567-89ab-cdef-0123-456789abcdef', false);

INSERT INTO identifier_fingerprints (id, identifier, raw_identifier, seed, recorded_wire, recorded_hash, recorded_seeded, recorded_zero, recorded_version, skip_parse) VALUES (1, '01234567-89ab-4def-8123-456789abcdef', '01234567-89ab-4def-8123-456789abcdef', 1, '\x0123456789ab4def8123456789abcdef', 1980659289, -5227956059267306396, -8882000122858277287, 4, false);
