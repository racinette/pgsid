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

-- name: transform_masked_features
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (400, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'4A', X'52', 1, false);

-- name: transform_zero_features
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (401, 1, X'00', X'FF', X'00', X'FF', X'00', X'FF', X'FF', X'FF', X'00', X'00', 0, false);

-- name: transform_shift_all_features_out
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (402, 1, X'FF', X'F0', X'FF', X'F0', X'F0', X'FF', X'0F', X'00', X'00', X'00', 8, false);

-- name: transform_partial_octet
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (403, 1, NULL, NULL, B'101', B'011', B'001', NULL, B'110', NULL, B'010', B'010', 1, false);

-- name: transform_empty_features
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (404, 1, NULL, NULL, B'', B'', B'', NULL, B'', NULL, B'', B'', 0, false);

-- name: transform_partial_second_octet
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (405, 1, NULL, NULL, B'100000001', B'100000000', B'100000000', NULL, B'000000001', NULL, B'000000010', B'010000000', 1, false);

-- name: transform_reverse_shift_direction
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (406, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'52', X'4A', -1, false);

-- name: transform_shift_beyond_width
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (407, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'00', X'00', 9, false);

-- name: transform_minimum_shift_distance
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (408, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'00', X'00', -2147483648, false);

-- name: transform_maximum_shift_distance
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (409, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'00', X'00', 2147483647, false);

-- name: transform_negative_full_width
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (410, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'00', X'00', -8, false);

-- name: transform_wrong_intersection
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (411, 1, X'A5', X'0F', X'A5', X'0F', X'04', X'AF', X'AA', X'5A', X'4A', X'52', 1, false);

-- name: transform_wrong_union
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (412, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AE', X'AA', X'5A', X'4A', X'52', 1, false);

-- name: transform_wrong_exclusive
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (413, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AB', X'5A', X'4A', X'52', 1, false);

-- name: transform_wrong_complement
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (414, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5B', X'4A', X'52', 1, false);

-- name: transform_wrong_left_shift
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (415, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'4B', X'52', 1, false);

-- name: transform_wrong_right_shift
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (416, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'4A', X'53', 1, false);

-- name: transform_mismatched_flexible_widths
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (417, 1, NULL, NULL, B'1', B'10', B'0', NULL, B'1', NULL, B'1', B'1', 0, false);

-- name: transform_mismatched_empty_width
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (418, 1, NULL, NULL, B'', B'1', B'', NULL, B'', NULL, B'', B'', 0, false);

-- name: transform_skip_mismatched_flexible_widths
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (419, 1, X'A5', X'0F', B'1', B'10', X'05', X'AF', X'AA', X'5A', B'1', B'1', 0, true);

-- name: transform_null_flexible_fallback
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (420, 1, X'A5', X'0F', NULL, B'1', X'05', X'AF', X'AA', X'5A', NULL, NULL, 1, false);

-- name: transform_null_shift_distance
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (421, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', NULL, NULL, NULL, false);

-- name: transform_null_choice_flag
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (422, 1, X'A5', X'0F', X'A5', X'0F', X'05', X'AF', X'AA', X'5A', X'4A', X'52', 1, NULL);

-- name: transform_null_masks
INSERT INTO mask_transforms (id, profile_id, source_mask, filter_mask, flexible_mask, flexible_filter, recorded_intersection, recorded_union, recorded_exclusive, recorded_complement, recorded_left, recorded_right, shift_distance, use_fixed)
VALUES (423, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: mask_import_truncates_explicit_casts
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (500, 1, '10101010', '10101010', B'10101010', B'101', B'101', B'101', B'101', '10101010', 3, false, false);

-- name: mask_import_pads_fixed_casts_only
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (501, 1, '1', '1', NULL, B'1', B'100', B'1', B'1', NULL, 1, false, false);

-- name: empty_mask_import_preserves_varying_width
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (502, 1, '', '', NULL, B'', B'000', B'', B'', NULL, 0, false, false);

-- name: mask_import_decodes_hexadecimal
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (503, 1, 'xAf', 'XAF', X'AF', B'101', B'101', B'101', B'101', '10101111', 3, false, false);

-- name: mask_import_decodes_binary_prefixes
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (504, 1, 'b01', 'B01', NULL, B'01', B'010', B'01', B'01', NULL, 2, false, false);

-- name: mask_import_explicit_assignment_truncates
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (505, 1, '10101', '10101', NULL, B'10101', B'101', B'101', B'101', NULL, 3, true, false);

-- name: mask_import_rejects_fixed_assignment_padding
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (506, 1, '1', '1', NULL, B'1', B'100', B'1', B'1', NULL, 3, false, false);

-- name: mask_import_rejects_implicit_assignment_truncation
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (507, 1, '10101', '10101', NULL, B'10101', B'101', B'101', B'101', NULL, 3, false, false);

-- name: mask_import_explicit_padding_differs_from_varying_coercion
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (508, 1, '1', '1', NULL, B'1', B'100', B'1', B'100', NULL, 3, true, false);

-- name: mask_import_rejects_wrong_fixed_result
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (509, 1, '10101010', '10101010', B'10101010', B'101', B'100', B'101', B'101', '10101010', 3, false, false);

-- name: mask_import_rejects_wrong_varying_result
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (510, 1, '10101010', '10101010', B'10101010', B'101', B'101', B'100', B'101', '10101010', 3, false, false);

-- name: mask_import_rejects_wrong_text_output
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (511, 1, '10101010', '10101010', B'10101010', B'101', B'101', B'101', B'101', '101', 3, false, false);

-- name: mask_import_rejects_wrong_assignment_result
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (512, 1, '10101010', '10101010', B'10101010', B'101', B'101', B'101', B'100', '10101010', 3, false, false);

-- name: mask_import_rejects_malformed_binary_text
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (513, 1, '102', '101', NULL, B'101', B'101', B'101', B'101', NULL, 3, false, false);

-- name: mask_import_rejects_malformed_hexadecimal_varchar
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (514, 1, '101', 'xG', NULL, B'101', B'101', B'101', B'101', NULL, 3, false, false);

-- name: mask_import_does_not_trim_text_whitespace
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (515, 1, ' 101', '101', NULL, B'101', B'101', B'101', B'101', NULL, 3, false, false);

-- name: mask_import_skips_malformed_text_through_installed_choice
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (516, 1, 'xG', '102', B'10101010', B'101', B'101', B'101', B'101', '10101010', 3, false, true);

-- name: mask_import_unknown_choice_selects_text_arm
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (517, 1, 'xG', '101', B'10101010', B'101', B'101', B'101', B'101', '10101010', 3, false, NULL);

-- name: mask_import_null_text_propagates
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (518, 1, NULL, NULL, B'10101010', B'101', B'101', B'101', B'101', '10101010', 3, false, false);

-- name: mask_import_null_expected_values_propagate
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (519, 1, '101', '101', B'10101010', B'101', NULL, NULL, NULL, NULL, 3, false, false);

-- name: mask_import_null_width_propagates
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (520, 1, '101', '101', B'10101010', B'101', B'101', B'101', B'101', '10101010', NULL, false, false);

-- name: mask_import_null_explicit_flag_propagates
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (521, 1, '101', '101', B'10101010', B'101', B'101', B'101', B'101', '10101010', 3, NULL, false);

-- name: mask_import_all_null_values_propagate
INSERT INTO mask_imports (id, profile_id, source_text, source_varchar, installed_bits, flexible_bits, expected_fixed, expected_varying, expected_assignment, rendered_text, assignment_width, assignment_explicit, use_installed)
VALUES (522, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: mask_encoding_positive_low_bits
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (600, 1, 7, 7, B'111', B'00000111', B'0000000000000111', 7, 7, B'1', false, false);

-- name: mask_encoding_negative_twos_complement
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (601, 1, -1, -1, X'FFFFFFFF', X'FF', X'FFFF', -1, 4294967295, B'1', false, true);

-- name: mask_encoding_integer_minimum
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (602, 1, -2147483648, -2147483648, X'80000000', X'00', X'0000', -2147483648, 2147483648, B'0', false, false);

-- name: mask_encoding_bigint_minimum
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (603, 1, 0, -9223372036854775808, NULL, X'00', X'0000', 0, NULL, B'0', false, true);

-- name: mask_encoding_bigint_maximum
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (604, 1, 2147483647, 9223372036854775807, X'7FFFFFFF', X'FF', X'FFFF', 2147483647, 2147483647, B'1', false, false);

-- name: mask_encoding_short_high_bit_is_unsigned
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (605, 1, 1, 1, B'1', X'01', X'0001', 1, 1, B'1', false, false);

-- name: mask_encoding_leading_zeros
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (606, 1, 7, 7, B'000000111', X'07', X'0007', 7, 7, B'1', false, false);

-- name: mask_encoding_empty_bits_are_zero
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (607, 1, 0, 0, B'', X'00', X'0000', 0, 0, B'0', false, false);

-- name: mask_encoding_rejects_integer_encoding
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (608, 1, 7, 7, B'111', X'08', X'0007', 7, 7, B'1', false, false);

-- name: mask_encoding_rejects_bigint_encoding
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (609, 1, 7, 7, B'111', X'07', X'0008', 7, 7, B'1', false, false);

-- name: mask_encoding_rejects_wrong_integer_decode
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (610, 1, 7, 7, B'111', X'07', X'0007', 8, 7, B'1', false, false);

-- name: mask_encoding_rejects_wrong_bigint_decode
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (611, 1, 7, 7, B'111', X'07', X'0007', 7, 8, B'1', false, false);

-- name: mask_encoding_rejects_wrong_default_width
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (612, 1, 7, 7, B'111', X'07', X'0007', 7, 7, B'0', false, false);

-- name: mask_encoding_rejects_oversized_zero_integer
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (613, 1, 0, 0, B'000000000000000000000000000000000', X'00', X'0000', 0, 0, B'0', false, false);

-- name: mask_encoding_rejects_oversized_zero_bigint
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (614, 1, 0, 0, B'00000000000000000000000000000000000000000000000000000000000000000', X'00', X'0000', 0, 0, B'0', false, false);

-- name: mask_encoding_skips_oversized_input
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (615, 1, 7, 7, B'00000000000000000000000000000000000000000000000000000000000000000', X'07', X'0007', 7, 7, B'1', true, true);

-- name: mask_encoding_null_choice_evaluates_oversized_input
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (616, 1, 0, 0, B'000000000000000000000000000000000', X'00', X'0000', 0, 0, B'0', NULL, NULL);

-- name: mask_encoding_coalesce_uses_bits_after_null
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (617, 1, NULL, 7, B'111', NULL, X'0007', 7, 7, NULL, false, false);

-- name: mask_encoding_coalesce_reaches_overflow
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (618, 1, NULL, 0, B'000000000000000000000000000000000', NULL, X'0000', 0, 0, NULL, true, true);

-- name: mask_encoding_null_values_propagate
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (619, 1, NULL, NULL, NULL, X'07', X'0007', 7, 7, B'1', false, false);

-- name: mask_encoding_null_expected_values_propagate
INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (620, 1, 7, 7, B'111', NULL, NULL, NULL, NULL, NULL, false, false);
