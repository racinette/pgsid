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

INSERT INTO mask_encodings (id, profile_id, source_integer, source_bigint, source_bits, expected_integer_bits, expected_bigint_bits, expected_integer, expected_bigint, expected_low_bit, skip_decode, select_integer)
VALUES (1, 1, 7, 7, B'111', B'00000111', B'0000000000000111', 7, 7, B'1', false, false);

INSERT INTO mask_patches (id, profile_id, original_mask, flexible_mask, suffix_mask, recorded_combination, bit_position, replacement_bit, recorded_bit, recorded_patch, use_original)
VALUES (1, 1, B'10101010', NULL, B'101', B'10101010101', 0, 0, 1, B'00101010', false);

INSERT INTO mask_windows (id, profile_id, original_mask, flexible_mask, start_position, window_length, recorded_window, recorded_suffix, default_window, use_original)
VALUES (1, 1, B'10101010', B'10101010', 2, 3, B'010', B'0101010', NULL, false);

INSERT INTO mask_overlays (id, profile_id, original_mask, flexible_mask, replacement_mask, start_position, replacement_length, recorded_overlay, recorded_default_overlay, default_mask, use_original)
VALUES (1, 1, B'10101010', B'10101010', B'11', 3, 2, B'10111010', B'10111010', NULL, false);

INSERT INTO mask_searches (id, profile_id, original_mask, flexible_mask, pattern_mask, recorded_position, recorded_presence, default_position, use_default)
VALUES (1, 1, B'00101101', B'00101101', B'101', 3, true, NULL, false);

INSERT INTO mask_counts (id, profile_id, original_mask, flexible_mask, recorded_count, recorded_small_count, default_count, use_default)
VALUES (1, 1, B'00101101', B'00101101', 4, 4, NULL, false);

INSERT INTO mask_packets (id, profile_id, original_mask, flexible_mask, recorded_wire, default_wire, use_default)
VALUES (1, 1, B'00101101', B'00101101', '\x000000082d', NULL, false);

INSERT INTO mask_payloads (id, profile_id, packet, peer_packet, recorded_comparison, larger_packet, smaller_packet, reversed_packet, transmitted_packet, recorded_length, recorded_bits, recorded_count)
VALUES (1, 1, '\x0080ff', '\x008100', -1, '\x008100', '\x0080ff', '\xff8000', '\x0080ff', 3, 24, 9);

INSERT INTO payload_patches (id, profile_id, packet, byte_position, bit_position, replacement_byte, replacement_bit, recorded_byte, recorded_bit, byte_patch, bit_patch)
VALUES (1, 1, '\x0080ff', 1, 15, -1, 0, 128, 1, '\x00ffff', '\x0000ff');

INSERT INTO payload_ranges (id, profile_id, packet, pattern, start_position, window_length, combined_packet, window_packet, suffix_packet, overlaid_packet, default_overlay, recorded_position, trimmed_packet, left_trimmed, right_trimmed)
VALUES (1, 1, '\x0080ff0100ff', '\xff00', 2, 3, '\x0080ff0100ffff00', '\x80ff01', '\x80ff0100ff', '\x00ff0000ff', '\x00ff000100ff', 0, '\x80ff01', '\x80ff0100ff', '\x0080ff01');

INSERT INTO payload_scalar_wires (id, profile_id, input_wire, source_small, source_integer, source_bigint, source_flag, source_day, source_local, source_instant, expected_small, expected_integer, expected_bigint, small_wire, integer_wire, bigint_wire, bool_wire, day_wire, local_wire, instant_wire)
VALUES (1, 1, '\x0007', -32768, -2147483648, -9223372036854775808, true, DATE '2000-01-01', TIMESTAMP '1999-12-31 23:59:59.999999', TIMESTAMPTZ '2000-01-01 05:30:00+05:30', 7, 7, 7, '\x8000', '\x80000000', '\x8000000000000000', '\x01', '\x00000000', '\xffffffffffffffff', '\x0000000000000000');

INSERT INTO payload_hashes (id, profile_id, packet, seed, recorded_hash, recorded_seeded, recorded_crc, recorded_crc_c)
VALUES (1, 1, '\x0080ff', -1, -1033711642, 4215318346883157957, 3921718996, 920259282);
