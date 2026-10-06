INSERT INTO device_identifiers (id, identifier, floor_identifier, ceiling_identifier, backup_identifier, recorded_identifier, prefer_primary, recorded_text, comparison)
VALUES (1, '01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', true, '01234567-89ab-cdef-0123-456789abcdef', -254);
INSERT INTO identifier_imports (id, raw_identifier, legacy_identifier, recorded_identifier, skip_import)
VALUES (1, '{0123456789ABCDEF0123456789ABCDEF}', '0123-4567-89ab-cdef-0123-4567-89ab-cdef', '01234567-89ab-cdef-0123-456789abcdef', false);
