-- name: profile_binary_mask
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (100, B'00101101', B'00101101', B'00000000', X'FF', 8, 1, 45);

-- name: profile_hexadecimal_mask
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (101, X'2d', X'2D', X'00', X'FF', 8, 1, 45);

-- name: profile_zero_mask
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (102, B'00000000', X'00', X'00', X'FF', 8, 1, 0);

-- name: profile_all_features
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (103, X'FF', B'11111111', X'00', X'FF', 8, 1, 255);

-- name: profile_wrong_width_record
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (104, X'2D', X'2D', X'00', X'FF', 7, 1, 45);

-- name: profile_wrong_octet_record
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (105, X'2D', X'2D', X'00', X'FF', 8, 2, 45);

-- name: profile_wrong_mask_record
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (106, X'2D', X'2C', X'00', X'FF', 8, 1, 45);

-- name: profile_below_floor
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (107, X'2D', X'2D', X'2E', X'FF', 8, 1, -1);

-- name: profile_above_ceiling
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (108, X'2D', X'2D', X'00', X'2C', 8, 1, 45);

-- name: profile_wrong_comparator
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (109, X'2D', X'2D', X'00', X'FF', 8, 1, 1);

-- name: profile_null_mask
INSERT INTO mask_profiles (id, primary_mask, recorded_mask, floor_mask, ceiling_mask, declared_bits, declared_octets, recorded_comparison)
VALUES (110, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: rule_leading_zeroes
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (200, 1, B'001', B'001', B'001', B'', X'FF', true, 3, 1, 1);

-- name: rule_trailing_zeroes
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (201, 1, B'1000', B'1000', B'1000', B'1', X'FF', false, 4, 1, 1);

-- name: rule_empty_mask
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (202, 1, B'', B'', B'', B'', X'FF', false, 0, 0, 0);

-- name: rule_partial_second_octet
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (203, 1, B'100000001', B'100000001', B'100000001', B'1', X'FF', true, 9, 2, 1);

-- name: rule_hexadecimal_mask
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (204, 1, X'000f', B'0000000000001111', X'000F', B'', X'FFFF', true, 16, 2, 1);

-- name: rule_backup_default
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (205, 1, NULL, B'001', B'001', B'', X'FF', false, 3, 1, 1);

-- name: rule_wrong_default
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (206, 1, B'001', B'010', B'010', B'', X'FF', false, 3, 1, 1);

-- name: rule_wrong_selected_arm
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (207, 1, B'001', B'010', B'001', B'', X'FF', false, 3, 1, 1);

-- name: rule_unrecognized_mask
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (208, 1, B'001', B'010', B'011', B'', X'FF', true, 3, 1, 1);

-- name: rule_below_window
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (209, 1, B'10', B'10', B'10', B'101', X'FF', true, 2, 1, -32);

-- name: rule_above_window
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (210, 1, B'1', B'1', B'1', B'', B'01', true, 1, 1, 1);

-- name: rule_wrong_width_record
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (211, 1, B'001', B'001', B'001', B'', X'FF', true, 2, 1, 1);

-- name: rule_wrong_octet_record
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (212, 1, B'100000001', B'100000001', B'100000001', B'1', X'FF', true, 9, 1, 1);

-- name: rule_wrong_comparator
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (213, 1, B'001', B'001', B'001', B'', X'FF', true, 3, 1, 32);

-- name: rule_null_mask
INSERT INTO device_mask_rules (id, profile_id, requested_bits, backup_bits, recorded_bits, floor_bits, ceiling_bits, use_request, declared_bits, declared_octets, recorded_comparison)
VALUES (214, 1, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL);

-- name: snapshot_same_mask
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (300, 1, X'0F', B'00001111', B'00001111', true, true);

-- name: snapshot_all_features
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (301, 1, B'11111111', X'FF', X'FF', true, false);

-- name: snapshot_distinct_lengths
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (302, 1, B'1', B'10000000', NULL, false, true);

-- name: snapshot_wrong_match_flag
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (303, 1, X'0F', X'2D', NULL, true, true);

-- name: snapshot_wrong_selected_value
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (304, 1, X'0F', X'0F', X'FF', true, true);

-- name: snapshot_wrong_variable_default
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (305, 1, X'0F', X'0F', X'00', true, false);

-- name: snapshot_disallowed_mask
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (306, 1, B'001', X'00', NULL, false, true);

-- name: snapshot_empty_variable
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (307, 1, B'', NULL, B'', false, false);

-- name: snapshot_wrong_empty_flag
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (308, 1, B'', X'00', X'FF', false, false);

-- name: snapshot_fixed_default
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (309, 1, NULL, X'0F', X'0F', false, true);

-- name: snapshot_null_masks
INSERT INTO mask_snapshots (id, profile_id, variable_mask, fixed_mask, expected_mask, expected_match, prefer_fixed)
VALUES (310, 1, NULL, NULL, NULL, NULL, NULL);
