INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (1, B'00101101', B'00101101', B'00000000', X'FF', 8, 1, 45);

INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (1, 1, B'001', B'001', B'001', B'', X'FF', true, 3, 1, 1);

INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (1, 1, X'0F', B'00001111', B'00001111', true, true);
