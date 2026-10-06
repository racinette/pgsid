INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (1, B'00101101', B'00101101', B'00000000', X'FF', 8, 1, 45);

INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (1, 1, B'001', B'001', B'001', B'', X'FF', true, 3, 1, 1);

INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (1, 1, X'0F', B'00001111', B'00001111', true, true);

INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (1, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'4A', X'52', 1, false);

INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (1, 1, '10101010', '10101010', B'10101010', B'101', B'101', B'101', B'101', '10101010', 3, false, false);
