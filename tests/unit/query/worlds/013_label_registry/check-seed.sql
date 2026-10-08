-- name: labels_regular
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'alpha', 'alpha');
-- name: labels_mismatch
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'alpha', 'beta');
-- name: labels_spaces_significant
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'a ', 'a');
-- name: labels_matching_spaces
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'a  ', 'a  ');
-- name: labels_empty
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, '', '');
-- name: labels_unicode
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'café😀', 'café😀');
-- name: labels_normalization_significant
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'é', 'é');
-- name: labels_assignment_trims_excess_spaces
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'ABCDEFGH   ', 'ABCDEFGH');
-- name: labels_null_short
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, NULL, 'alpha');
-- name: labels_null_reference
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, 'alpha', NULL);
-- name: labels_all_null
INSERT INTO label_pairs (id, short_label, reference_label) VALUES (2, NULL, NULL);

-- name: fixed_regular
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, 'A', 'A');
-- name: fixed_spaces_ignored
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, 'A', 'A   ');
-- name: fixed_blank_equals_empty
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, '', '   ');
-- name: fixed_mismatch
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, 'A', 'B');
-- name: fixed_tab_significant
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, E'A\t', 'A');
-- name: fixed_newline_significant
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, E'A\n', 'A');
-- name: fixed_nonbreaking_space_significant
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, 'A ', 'A');
-- name: fixed_unicode_padding
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, '😀é', '😀é   ');
-- name: fixed_normalization_significant
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, 'é', 'é');
-- name: fixed_null_received
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, NULL, 'A');
-- name: fixed_null_expected
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, 'A', NULL);
-- name: fixed_all_null
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (2, NULL, NULL);

-- name: band_regular
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, 'M', 'A', 'Z');
-- name: band_equal_lower
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, 'A   ', 'A', 'Z');
-- name: band_equal_upper
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, 'Z', 'A', 'Z   ');
-- name: band_below
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, '@', 'A', 'Z');
-- name: band_above
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, '[', 'A', 'Z');
-- name: band_unicode
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, 'é', 'z', '😀');
-- name: band_reversed
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, 'M', 'Z', 'A');
-- name: band_all_null
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (2, NULL, NULL, NULL);

-- name: defaults_regular
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, 'alpha', 'alpha', 'A', 'A');
-- name: defaults_spaces_ignored_for_char
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, 'a ', 'a ', 'A ', 'A');
-- name: defaults_spaces_significant_for_varchar
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, 'a ', 'a', 'A', 'A');
-- name: defaults_char_mismatch
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, 'alpha', 'alpha', 'A', 'B');
-- name: defaults_unicode
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, '😀é', '😀é', '😀é', '😀é  ');
-- name: defaults_null_varchar
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, NULL, NULL, 'A', 'A');
-- name: defaults_null_char
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, 'alpha', 'alpha', NULL, NULL);
-- name: defaults_all_null
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (2, NULL, NULL, NULL, NULL);


-- name: unicode_label_ascii
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 65, 65, 'A', 65, false);
-- name: unicode_label_accent
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 233, 65, 'é', 233, false);
-- name: unicode_label_astral
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 128512, 65, '😀', 128512, false);
-- name: unicode_label_last_scalar
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 1114111, 65, '􏿿', 1114111, false);
-- name: unicode_label_before_surrogate
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 55295, 65, '퟿', 55295, false);
-- name: unicode_label_after_surrogate
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 57344, 65, '', 57344, false);
-- name: unicode_label_wrong_text
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 233, 65, 'A', 233, false);
-- name: unicode_label_wrong_ordinal
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 233, 65, 'é', 65, false);
-- name: unicode_label_decomposed_text
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 233, 65, 'é', 233, false);
-- name: unicode_label_fallback
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, NULL, 233, 'é', 233, false);
-- name: unicode_label_wrong_fallback
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, NULL, 65, 'é', 233, false);
-- name: unicode_label_null_text
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 233, 65, NULL, 233, false);
-- name: unicode_label_null_ordinal
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 233, 65, 'é', NULL, false);
-- name: unicode_label_all_null
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, NULL, NULL, NULL, NULL, false);
-- name: unicode_label_negative
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, -1, 65, 'A', -1, false);
-- name: unicode_label_negative_limit
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, -2147483648, 65, 'A', -2147483648, false);
-- name: unicode_label_zero
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 0, 65, 'A', 0, false);
-- name: unicode_label_first_surrogate
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 55296, 65, 'A', 55296, false);
-- name: unicode_label_last_surrogate
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 57343, 65, 'A', 57343, false);
-- name: unicode_label_above_unicode
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 1114112, 65, 'A', 1114112, false);
-- name: unicode_label_integer_limit
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 2147483647, 65, 'A', 2147483647, false);
-- name: unicode_label_lazy_negative
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, -1, 0, 'A', -1, true);
-- name: unicode_label_lazy_surrogate
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 55296, 0, 'A', 55296, true);
-- name: unicode_label_unused_bad_fallback
INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (2, 65, -1, 'A', 65, false);

-- name: label_character_sizes_unicode
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (10, false, 'é😊  ', 'é😊  ', 64, 2, 4, 2, 4, 2, 8, 8, 4);

-- name: label_character_sizes_wrong_records
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (11, false, 'é😊  ', 'é😊  ', 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- name: label_character_sizes_skipped_records
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (12, true, 'é😊  ', 'é😊  ', 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- name: label_character_sizes_ascii
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (13, false, 'abc', 'abc  ', 24, 3, 3, 3, 3, 3, 5, 3, 3);

-- name: label_character_sizes_combining
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (14, false, 'é', 'é  ', 24, 2, 2, 2, 2, 2, 5, 3, 2);

-- name: label_character_sizes_empty
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (15, false, '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- name: label_character_sizes_spaces
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (16, false, '   ', '   ', 24, 0, 3, 0, 3, 0, 3, 3, 3);

-- name: label_character_sizes_null
INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (17, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: label_binary_order_unicode
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (18, false, 'é😊 ', 'αβ', 'é😊  ', 'αβ ', 'αβ ', 5, false, false, true, true, 'é😊  ', 8, -11, -11, -11, -11, 'αβ', false, false, true, true, 'é😊 ');

-- name: label_binary_order_wrong_records
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (19, false, 'é😊 ', 'αβ', 'é😊  ', 'αβ ', 'αβ !', 0, true, true, false, false, 'é😊  !', 0, 0, 0, 0, 0, 'αβ!', true, true, false, false, 'é😊 !');

-- name: label_binary_order_skipped_records
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (20, true, 'é😊 ', 'αβ', 'é😊  ', 'αβ ', 'αβ !', 0, true, true, false, false, 'é😊  !', 0, 0, 0, 0, 0, 'αβ!', true, true, false, false, 'é😊 !');

-- name: label_binary_order_ascii
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (21, false, 'a ', 'z', 'a  ', 'z ', 'z ', 2, false, false, true, true, 'a  ', 3, -25, -25, -25, -25, 'z', false, false, true, true, 'a ');

-- name: label_binary_order_padding_tie
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (22, false, 'a ', 'a', 'a  ', 'a', 'a  ', 3, true, false, true, false, 'a  ', 3, 0, 0, 1, 1, 'a ', true, true, false, false, 'a');

-- name: label_binary_order_prefix
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (23, false, 'a', 'abcd', 'a ', 'abcd ', 'abcd ', 5, false, false, true, true, 'a ', 2, -1, -1, -1, -1, 'abcd', false, false, true, true, 'a');

-- name: label_binary_order_empty
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (24, false, '', 'a', '', 'a ', 'a ', 2, false, false, true, true, '', 0, -1, -1, -1, -1, 'a', false, false, true, true, '');

-- name: label_binary_order_null
INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (25, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: cleaned_label_records_unicode
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (26, false, '  😊parcel😊  ', '😊 ', '😊parcel😊', 'parcel', '😊parcel😊  ', 'parcel😊  ', '  😊parcel😊', '  😊parcel');

-- name: cleaned_label_records_wrong_records
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (27, false, '  😊parcel😊  ', '😊 ', '😊parcel😊!', 'parcel!', '😊parcel😊  !', 'parcel😊  !', '  😊parcel😊!', '  😊parcel!');

-- name: cleaned_label_records_skipped_records
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (28, true, '  😊parcel😊  ', '😊 ', '😊parcel😊!', 'parcel!', '😊parcel😊  !', 'parcel😊  !', '  😊parcel😊!', '  😊parcel!');

-- name: cleaned_label_records_combining
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (29, false, 'éx́e', 'e', 'éx́e', '́x́', 'éx́e', '́x́e', 'éx́e', 'éx́');

-- name: cleaned_label_records_empty_set
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (30, false, '  label  ', '', 'label', '  label  ', 'label  ', '  label  ', '  label', '  label  ');

-- name: cleaned_label_records_empty
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (31, false, '', 'a', '', '', '', '', '', '');

-- name: cleaned_label_records_spaces
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (32, false, '   ', ' ', '', '', '', '', '', '');

-- name: cleaned_label_records_null
INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (33, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: label_casing_records_unicode
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (34, false, 'élÈVE STRAẞE İß Σσς', 'élÈve straẞe İß Σσς', 'éLÈVe StraẞE İß Σσς', 'élÈve straẞe İß Σσς', 'éLÈVE STRAẞE İß Σσς');

-- name: label_casing_records_wrong_records
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (35, false, 'élÈVE STRAẞE İß Σσς', 'élÈve straẞe İß Σσς!', 'éLÈVe StraẞE İß Σσς!', 'élÈve straẞe İß Σσς!', 'éLÈVE STRAẞE İß Σσς!');

-- name: label_casing_records_skipped_records
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (36, true, 'élÈVE STRAẞE İß Σσς', 'élÈve straẞe İß Σσς!', 'éLÈVe StraẞE İß Σσς!', 'élÈve straẞe İß Σσς!', 'éLÈVE STRAẞE İß Σσς!');

-- name: label_casing_records_ascii
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (37, false, 'aBC DEF 123ABC', 'abc def 123abc', 'Abc Def 123abc', 'abc def 123abc', 'ABC DEF 123ABC');

-- name: label_casing_records_word_breaks
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (38, false, 'aÉb😊c d_e-f.g', 'aÉb😊c d_e-f.g', 'AÉB😊C D_E-F.G', 'aÉb😊c d_e-f.g', 'AÉB😊C D_E-F.G');

-- name: label_casing_records_empty
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (39, false, '', '', '', '', '');

-- name: label_casing_records_spaces
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (40, false, '   ', '   ', '   ', '   ', '   ');

-- name: label_casing_records_null
INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (41, false, NULL, NULL, NULL, NULL, NULL);

-- name: fingerprint_empty
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('10', false, '', '', '', '0', '-1477818771', '-1477818771', '-6939563903564495251', '-6939563903564495251', '0', '0');

-- name: fingerprint_ascii
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('11', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '5333970338675577285', '-25', '-25');

-- name: fingerprint_wrong_recorded_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('12', false, 'alpha', 'alpha  ', 'z', '1', '0', '956903556', '5333970338675577285', '5333970338675577285', '-25', '-25');

-- name: fingerprint_skipped_recorded_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('13', true, 'alpha', 'alpha  ', 'z', '1', '0', '956903556', '5333970338675577285', '5333970338675577285', '-25', '-25');

-- name: fingerprint_wrong_recorded_fixed_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('14', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '0', '5333970338675577285', '5333970338675577285', '-25', '-25');

-- name: fingerprint_skipped_recorded_fixed_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('15', true, 'alpha', 'alpha  ', 'z', '1', '956903556', '0', '5333970338675577285', '5333970338675577285', '-25', '-25');

-- name: fingerprint_wrong_recorded_seeded_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('16', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '0', '5333970338675577285', '-25', '-25');

-- name: fingerprint_skipped_recorded_seeded_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('17', true, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '0', '5333970338675577285', '-25', '-25');

-- name: fingerprint_wrong_recorded_fixed_seeded_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('18', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '0', '-25', '-25');

-- name: fingerprint_skipped_recorded_fixed_seeded_hash
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('19', true, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '0', '-25', '-25');

-- name: fingerprint_wrong_recorded_lexeme_order
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('20', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '5333970338675577285', '0', '-25');

-- name: fingerprint_skipped_recorded_lexeme_order
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('21', true, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '5333970338675577285', '0', '-25');

-- name: fingerprint_wrong_recorded_jsonb_order
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('22', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '5333970338675577285', '-25', '0');

-- name: fingerprint_skipped_recorded_jsonb_order
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('23', true, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '5333970338675577285', '-25', '0');

-- name: fingerprint_prefix
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('24', false, 'alphabet', 'alphabet   ', 'alpha', '-1', '-1132570125', '-1132570125', '8753196839503788723', '8753196839503788723', '1', '1');

-- name: fingerprint_combining
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('25', false, 'é', 'é  ', 'é', '4294967296', '-1336232949', '-1336232949', '-5435963409899874817', '-5435963409899874817', '-94', '-94');

-- name: fingerprint_unicode
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('26', false, 'é😊', 'é😊  ', 'ê', '9223372036854775807', '1791989009', '1791989009', '-3125482094749752454', '-3125482094749752454', '-1', '-1');

-- name: fingerprint_minimum_seed
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('27', false, '😊ab', '😊ab  ', '😊a', '-9223372036854775808', '1929821232', '1929821232', '1905475529381073425', '1905475529381073425', '1', '1');

-- name: fingerprint_whitespace
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('28', false, E' \t\n', E' \t\n  ', ' ', '4294967295', '1113247225', '1113247225', '-2798215134050698181', '-2798215134050698181', '1', '1');

-- name: fingerprint_all_blanks
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('29', false, '   ', '   ', '', '-4294967296', '-825235592', '-1477818771', '7765410445177570315', '-4136984213874271125', '1', '1');

-- name: fingerprint_equal
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('30', false, 'a', 'a  ', 'a', '2147483647', '1075015857', '1075015857', '-1241961749816775396', '-1241961749816775396', '0', '0');

-- name: fingerprint_null_inputs
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('31', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: fingerprint_null_seed
INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('32', false, 'a', 'a  ', 'b', NULL, '1075015857', '1075015857', NULL, NULL, '-1', '-1');

-- name: preview_ascii
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('10', false, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'bet', 'tebahpla', 'true');

-- name: preview_wrong_recorded_window
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('11', false, 'alphabet', '2', '3', true, 'incorrect', 'lphabet', 'alp', 'bet', 'tebahpla', 'true');

-- name: preview_skipped_recorded_window
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('12', true, 'alphabet', '2', '3', true, 'incorrect', 'lphabet', 'alp', 'bet', 'tebahpla', 'true');

-- name: preview_wrong_recorded_tail
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('13', false, 'alphabet', '2', '3', true, 'lph', 'incorrect', 'alp', 'bet', 'tebahpla', 'true');

-- name: preview_skipped_recorded_tail
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('14', true, 'alphabet', '2', '3', true, 'lph', 'incorrect', 'alp', 'bet', 'tebahpla', 'true');

-- name: preview_wrong_recorded_prefix
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('15', false, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'incorrect', 'bet', 'tebahpla', 'true');

-- name: preview_skipped_recorded_prefix
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('16', true, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'incorrect', 'bet', 'tebahpla', 'true');

-- name: preview_wrong_recorded_suffix
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('17', false, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'incorrect', 'tebahpla', 'true');

-- name: preview_skipped_recorded_suffix
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('18', true, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'incorrect', 'tebahpla', 'true');

-- name: preview_wrong_recorded_reverse
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('19', false, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'bet', 'incorrect', 'true');

-- name: preview_skipped_recorded_reverse
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('20', true, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'bet', 'incorrect', 'true');

-- name: preview_wrong_recorded_active
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('21', false, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'bet', 'tebahpla', 'incorrect');

-- name: preview_skipped_recorded_active
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('22', true, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'bet', 'tebahpla', 'incorrect');

-- name: preview_unicode
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('23', false, 'é😊α', '2', '2', false, '😊α', '😊α', 'é😊', '😊α', 'α😊é', 'false');

-- name: preview_combining
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('24', false, 'é😊', '1', '2', true, 'é', 'é😊', 'é', '́😊', '😊́e', 'true');

-- name: preview_empty
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('25', false, '', '1', '4', false, '', '', '', '', '', 'false');

-- name: preview_zero_start
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('26', false, 'alphabet', '0', '4', true, 'alp', 'alphabet', 'alph', 'abet', 'tebahpla', 'true');

-- name: preview_negative_start
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('27', false, 'alphabet', '-2', '4', true, 'a', 'alphabet', 'alph', 'abet', 'tebahpla', 'true');

-- name: preview_end_overflow
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('28', false, 'alphabet', '2', '2147483647', true, 'lphabet', 'lphabet', 'alphabet', 'alphabet', 'tebahpla', 'true');

-- name: preview_minimum_start
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('29', false, 'alphabet', '-2147483648', '2147483647', false, '', 'alphabet', 'alphabet', 'alphabet', 'tebahpla', 'false');

-- name: preview_maximum_start
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('30', false, 'alphabet', '2147483647', '2147483647', false, '', '', 'alphabet', 'alphabet', 'tebahpla', 'false');

-- name: preview_negative_width
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('31', false, 'alphabet', '2', '-2', true, '', 'lphabet', 'alphab', 'phabet', 'tebahpla', 'true');

-- name: preview_skipped_negative_width
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('32', true, 'alphabet', '2', '-2', true, '', 'lphabet', 'alphab', 'phabet', 'tebahpla', 'true');

-- name: preview_minimum_width
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('33', false, 'alphabet', '2', '-2147483648', true, '', 'lphabet', '', 'alphabet', 'tebahpla', 'true');

-- name: preview_skipped_minimum_width
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('34', true, 'alphabet', '2', '-2147483648', true, '', 'lphabet', '', 'alphabet', 'tebahpla', 'true');

-- name: preview_null_inputs
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('35', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: preview_null_start
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('36', false, 'alphabet', NULL, '3', NULL, NULL, NULL, 'alp', 'bet', 'tebahpla', NULL);

-- name: preview_null_width
INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('37', false, 'alphabet', '2', NULL, true, NULL, 'lphabet', NULL, NULL, 'tebahpla', 'true');

-- name: label_builders_sample_0
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (1,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_1
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (2,false,'é😊a'::pg_catalog.text,8,'🙂'::pg_catalog.text,'é😊'::pg_catalog.text,'     é😊a'::pg_catalog.text,12,'🙂🙂🙂🙂🙂é😊a'::pg_catalog.text,27,'é😊aé😊aé😊aé😊aé😊aé😊aé😊aé😊a'::pg_catalog.text,56,'é😊a     '::pg_catalog.text,12,'é😊a🙂🙂🙂🙂🙂'::pg_catalog.text,27,'🙂a'::pg_catalog.text,5);

-- name: label_builders_sample_2
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (3,false,'é😊a'::pg_catalog.text,2,'🙂'::pg_catalog.text,'é😊'::pg_catalog.text,'é😊'::pg_catalog.text,6,'é😊'::pg_catalog.text,6,'é😊aé😊a'::pg_catalog.text,14,'é😊'::pg_catalog.text,6,'é😊'::pg_catalog.text,6,'🙂a'::pg_catalog.text,5);

-- name: label_builders_sample_3
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (4,false,'é'::pg_catalog.text,1,'😊'::pg_catalog.text,'e'::pg_catalog.text,'e'::pg_catalog.text,1,'e'::pg_catalog.text,1,'é'::pg_catalog.text,3,'e'::pg_catalog.text,1,'e'::pg_catalog.text,1,'😊́'::pg_catalog.text,6);

-- name: label_builders_sample_4
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (5,false,'abc'::pg_catalog.text,-1,'x'::pg_catalog.text,'abc'::pg_catalog.text,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,'x'::pg_catalog.text,1);

-- name: label_builders_sample_5
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (6,false,'abc'::pg_catalog.text,-2147483648,'x'::pg_catalog.text,'abc'::pg_catalog.text,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,'x'::pg_catalog.text,1);

-- name: label_builders_sample_6
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (7,false,''::pg_catalog.text,7,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'       '::pg_catalog.text,7,'😊😊😊😊😊😊😊'::pg_catalog.text,28,''::pg_catalog.text,0,'       '::pg_catalog.text,7,'😊😊😊😊😊😊😊'::pg_catalog.text,28,''::pg_catalog.text,0);

-- name: label_builders_sample_7
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (8,false,'abc'::pg_catalog.text,7,''::pg_catalog.text,'abc'::pg_catalog.text,'    abc'::pg_catalog.text,7,'abc'::pg_catalog.text,3,'abcabcabcabcabcabcabc'::pg_catalog.text,21,'abc    '::pg_catalog.text,7,'abc'::pg_catalog.text,3,''::pg_catalog.text,0);

-- name: label_builders_sample_8
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (9,false,'abc'::pg_catalog.text,0,'x'::pg_catalog.text,'abc'::pg_catalog.text,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,'x'::pg_catalog.text,1);

-- name: label_builders_sample_9
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (10,false,'aab'::pg_catalog.text,7,'XYZ'::pg_catalog.text,'aab'::pg_catalog.text,'    aab'::pg_catalog.text,7,'XYZXaab'::pg_catalog.text,7,'aabaabaabaabaabaabaab'::pg_catalog.text,21,'aab    '::pg_catalog.text,7,'aabXYZX'::pg_catalog.text,7,'XXZ'::pg_catalog.text,3);

-- name: label_builders_sample_10
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (11,false,'abcabc'::pg_catalog.text,3,'😊x'::pg_catalog.text,'ab'::pg_catalog.text,'abc'::pg_catalog.text,3,'abc'::pg_catalog.text,3,'abcabcabcabcabcabc'::pg_catalog.text,18,'abc'::pg_catalog.text,3,'abc'::pg_catalog.text,3,'😊xc😊xc'::pg_catalog.text,12);

-- name: label_builders_sample_11
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (12,false,'α😊α'::pg_catalog.text,3,'🙂'::pg_catalog.text,'α😊'::pg_catalog.text,'α😊α'::pg_catalog.text,8,'α😊α'::pg_catalog.text,8,'α😊αα😊αα😊α'::pg_catalog.text,24,'α😊α'::pg_catalog.text,8,'α😊α'::pg_catalog.text,8,'🙂🙂'::pg_catalog.text,8);

-- name: label_builders_sample_12
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (13,false,NULL,3,'x'::pg_catalog.text,'ab'::pg_catalog.text,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- name: label_builders_sample_13
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (14,false,'abc'::pg_catalog.text,NULL,'x'::pg_catalog.text,'ab'::pg_catalog.text,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'xc'::pg_catalog.text,2);

-- name: label_builders_sample_14
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (15,false,'abc'::pg_catalog.text,3,'x'::pg_catalog.text,NULL,'abc'::pg_catalog.text,3,'abc'::pg_catalog.text,3,'abcabcabc'::pg_catalog.text,9,'abc'::pg_catalog.text,3,'abc'::pg_catalog.text,3,NULL,NULL);

-- name: label_builders_sample_15
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (16,false,'abc'::pg_catalog.text,3,NULL,'ab'::pg_catalog.text,'abc'::pg_catalog.text,3,NULL,NULL,'abcabcabc'::pg_catalog.text,9,'abc'::pg_catalog.text,3,NULL,NULL,NULL,NULL);

-- name: label_builders_sample_16
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (17,false,'😊'::pg_catalog.text,268435455,'x'::pg_catalog.text,'a'::pg_catalog.text,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,'😊'::pg_catalog.text,4);

-- name: label_builders_sample_17
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (18,false,'😊'::pg_catalog.text,2147483647,'x'::pg_catalog.text,'a'::pg_catalog.text,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,''::pg_catalog.text,0,'😊'::pg_catalog.text,4);

-- name: label_builders_sample_18
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (19,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc!'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_19
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (20,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc!'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_20
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (21,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc!'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_21
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (22,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     !'::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_22
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (23,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊!'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_23
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (24,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c!'::pg_catalog.text,5);

-- name: label_builders_sample_24
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (25,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,-1,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_25
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (26,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,-1,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_26
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (27,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,-1,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_27
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (28,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,-1,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_28
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (29,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,-1,'😊c'::pg_catalog.text,5);

-- name: label_builders_sample_29
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (30,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,-1);

-- name: label_builders_skipped_error
INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (31,true,'abc'::pg_catalog.text,2147483647,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

-- name: label_edits_sample_0
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (1,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_sample_1
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (2,false,'é😊α😊','🙂','😊','😊',2,1,-1,'é😊α😊🙂',16,2,2,'é🙂α😊',12,'é🙂α😊',12,'é🙂α🙂',12,'',0);

-- name: label_edits_sample_2
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (3,false,'abc','XY','missing','-',1,0,1,'abcXY',5,0,0,'XYc',3,'XYabc',5,'abc',3,'abc',3);

-- name: label_edits_sample_3
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (4,false,'abc','','','',3,2,-1,'abc',3,1,1,'abc',3,'ab',2,'abc',3,'abc',3);

-- name: label_edits_sample_4
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (5,false,'','','','',1,0,1,'',0,1,1,'',0,'',0,'',0,'',0);

-- name: label_edits_sample_5
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (6,false,'aaaaa','Z','aa','aa',2,-2,2,'aaaaaZ',6,1,1,'aZaaa',5,'aZaaaaa',7,'ZZa',3,'',0);

-- name: label_edits_sample_6
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (7,false,'abc','XY','a','b',10,2,2,'abcXY',5,1,1,'abcXY',5,'abcXY',5,'XYbc',4,'c',1);

-- name: label_edits_sample_7
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (8,false,'abc','X','bc','c',1,0,-2,'abcX',4,2,2,'Xbc',3,'Xabc',4,'aX',2,'ab',2);

-- name: label_edits_sample_8
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (9,false,'a,,b,','X',',',',',2,1,-1,'a,,b,X',6,2,2,'aX,b,',5,'aX,b,',5,'aXXbX',5,'',0);

-- name: label_edits_sample_9
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (10,false,'abc','X','bc','',2,1,2,'abcX',4,2,2,'aXc',3,'aXc',3,'aX',2,'',0);

-- name: label_edits_sample_10
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (11,false,'abc','X','bc','b',2,1,-2147483648,'abcX',4,2,2,'aXc',3,'aXc',3,'aX',2,'',0);

-- name: label_edits_sample_11
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (12,false,'é😊','α','́','😊',2,1,1,'é😊α',9,2,2,'eα😊',7,'eα😊',7,'eα😊',7,'é',3);

-- name: label_edits_sample_12
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (13,false,NULL,'X','a','b',2,1,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- name: label_edits_sample_13
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (14,false,'abc',NULL,'a','b',2,1,1,NULL,NULL,1,1,NULL,NULL,NULL,NULL,NULL,NULL,'a',1);

-- name: label_edits_sample_14
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (15,false,'abc','X',NULL,'b',2,1,1,'abcX',4,NULL,NULL,'aXc',3,'aXc',3,NULL,NULL,'a',1);

-- name: label_edits_sample_15
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (16,false,'abc','X','a',NULL,2,1,1,'abcX',4,1,1,'aXc',3,'aXc',3,'Xbc',3,NULL,NULL);

-- name: label_edits_sample_16
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (17,false,'abc','X','a','b',NULL,1,1,'abcX',4,1,1,NULL,NULL,NULL,NULL,'Xbc',3,'a',1);

-- name: label_edits_sample_17
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (18,false,'abc','X','a','b',2,NULL,1,'abcX',4,1,1,'aXc',3,NULL,NULL,'Xbc',3,'a',1);

-- name: label_edits_sample_18
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (19,false,'abc','X','a','b',2,1,NULL,'abcX',4,1,1,'aXc',3,'aXc',3,'Xbc',3,NULL,NULL);

-- name: label_edits_sample_19
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (20,false,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- name: label_edits_sample_20
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (21,false,'abc','X','a','b',0,1,1,'abcX',4,1,1,'',0,'',0,'Xbc',3,'a',1);

-- name: label_edits_sample_21
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (22,false,'abc','X','a','b',-2147483648,1,1,'abcX',4,1,1,'',0,'',0,'Xbc',3,'a',1);

-- name: label_edits_sample_22
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (23,false,'abc','X','a','b',2147483647,1,1,'abcX',4,1,1,'',0,'',0,'Xbc',3,'a',1);

-- name: label_edits_sample_23
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (24,false,'abc','X','a','b',2,2147483647,1,'abcX',4,1,1,'aXc',3,'',0,'Xbc',3,'a',1);

-- name: label_edits_sample_24
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (25,false,'abc','X','a','b',2,1,0,'abcX',4,1,1,'aXc',3,'aXc',3,'Xbc',3,'',0);

-- name: label_edits_wrong_joined
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (26,false,'aababa','😊','ab','ab',2,2,2,'aababa😊!',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_joined_octets
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (27,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',-99,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_needle_position
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (28,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,-99,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_alternate_position
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (29,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,-99,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_inserted
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (30,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba!',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_inserted_octets
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (31,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',-99,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_overwritten
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (32,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba!',8,'a😊😊a',10,'',0);

-- name: label_edits_wrong_overwritten_octets
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (33,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',-99,'a😊😊a',10,'',0);

-- name: label_edits_wrong_replaced
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (34,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a!',10,'',0);

-- name: label_edits_wrong_replaced_octets
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (35,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',-99,'',0);

-- name: label_edits_wrong_selected_field
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (36,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'!',0);

-- name: label_edits_wrong_selected_field_octets
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (37,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',-99);

-- name: label_edits_skipped_start_error
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (38,true,'aababa','😊','ab','ab',0,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_skipped_field_error
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (39,true,'aababa','😊','ab','ab',2,2,0,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_edits_skipped_end_overflow
INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (40,true,'aababa','😊','ab','ab',2147483647,1,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

-- name: label_formats_sample_0
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (1,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_1
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (2,false,'é😊a','é😊a','é😊a',6,true,'é😊',6,'é😊',6,'é😊a',7,'é😊a',7,'é😊a',7,'é😊a',7);

-- name: label_formats_sample_2
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (3,false,'a','a','a',9,true,'a',5,'a',1,'a',3,'a',1,'a',1,'a',3);

-- name: label_formats_sample_3
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (4,false,'','','',4,true,'',0,'',0,'',3,'',0,'',0,'',3);

-- name: label_formats_sample_4
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (5,false,'a  ','a  ','a  ',5,false,'a',1,'a',1,'a',3,'a  ',3,'a',1,'a',3);

-- name: label_formats_sample_5
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (6,false,'abc','abc','abc',5,false,'',0,'',0,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_6
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (7,false,'abc','abc','abc',4,false,'',0,'',0,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_7
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (8,false,'é😊a','é😊a','é😊a',6,false,'',0,'',0,'é😊a',7,'é😊a',7,'é😊a',7,'é😊a',7);

-- name: label_formats_sample_8
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (9,false,'é😊','é😊','é😊',5,true,'e',1,'e',1,'é😊',7,'é😊',7,'é😊',7,'é😊',7);

-- name: label_formats_sample_9
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (10,false,'  a','  a','  a',5,true,'',1,' ',1,'  a',3,'  a',3,'  a',3,'  a',3);

-- name: label_formats_sample_10
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (11,false,'abc','abc','abc',0,false,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_11
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (12,false,'abc','abc','abc',-2147483648,false,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_12
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (13,false,'abc','abc','abc',2147483647,true,'',0,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_13
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (14,false,NULL,'abc','abc',5,true,'a',1,'a',1,NULL,NULL,NULL,NULL,'abc',3,'abc',3);

-- name: label_formats_sample_14
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (15,false,'abc',NULL,'abc',5,true,NULL,NULL,'a',1,'abc',3,'abc',3,NULL,NULL,'abc',3);

-- name: label_formats_sample_15
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (16,false,'abc','abc',NULL,5,true,'a',1,NULL,NULL,'abc',3,'abc',3,'abc',3,NULL,NULL);

-- name: label_formats_sample_16
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (17,false,'abc','abc','abc',NULL,true,NULL,NULL,NULL,NULL,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_17
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (18,false,'abc','abc','abc',5,NULL,NULL,NULL,NULL,NULL,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_sample_18
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (19,false,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- name: label_formats_wrong_adjusted_fixed
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (20,false,'abc','abc','abc',7,true,'abc!',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_wrong_adjusted_fixed_octets
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (21,false,'abc','abc','abc',7,true,'abc',-1,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_wrong_adjusted_variable
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (22,false,'abc','abc','abc',7,true,'abc',3,'abc!',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_wrong_adjusted_variable_octets
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (23,false,'abc','abc','abc',7,true,'abc',3,'abc',-1,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_wrong_fixed_preview
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (24,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc!',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_wrong_fixed_preview_octets
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (25,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',-1,'abc',3,'abc',3,'abc',3);

-- name: label_formats_wrong_variable_preview
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (26,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc!',3,'abc',3,'abc',3);

-- name: label_formats_wrong_variable_preview_octets
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (27,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',-1,'abc',3,'abc',3);

-- name: label_formats_wrong_unpadded_preview
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (28,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc!',3,'abc',3);

-- name: label_formats_wrong_unpadded_preview_octets
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (29,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc',-1,'abc',3);

-- name: label_formats_wrong_padded_preview
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (30,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc!',3);

-- name: label_formats_wrong_padded_preview_octets
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (31,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',-1);

-- name: label_formats_skipped_truncation
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (32,true,'abc','abc','abc',5,false,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_formats_skipped_allocation
INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (33,true,'abc','abc','abc',2147483647,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

-- name: label_literals_sample_0
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (1,false,'ordinary','''ordinary''',10);

-- name: label_literals_sample_1
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (2,false,'O''Reilly','''O''''Reilly''',11);

-- name: label_literals_sample_2
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (3,false,'','''''',2);

-- name: label_literals_sample_3
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (4,false,'''','''''''''',4);

-- name: label_literals_sample_4
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (5,false,'''''','''''''''''''',6);

-- name: label_literals_sample_5
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (6,false,'\','E''\\''',5);

-- name: label_literals_sample_6
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (7,false,'''\','E''''''\\''',7);

-- name: label_literals_sample_7
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (8,false,'C:\labels\é😊','E''C:\\labels\\é😊''',21);

-- name: label_literals_sample_8
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (9,false,'a
β','''a
β''',6);

-- name: label_literals_sample_9
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (10,false,'a	b','''a	b''',5);

-- name: label_literals_sample_10
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (11,false,'é😊','''é😊''',8);

-- name: label_literals_sample_11
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (12,false,'é','''é''',5);

-- name: label_literals_sample_12
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (13,false,'select','''select''',8);

-- name: label_literals_sample_13
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (14,false,'"identifier"','''"identifier"''',14);

-- name: label_literals_sample_14
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (15,false,NULL,NULL,NULL);

-- name: label_literals_wrong_value
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (16,false,'ordinary','wrong',10);

-- name: label_literals_wrong_octets
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (17,false,'ordinary','''ordinary''',-1);

-- name: label_literals_null_recorded
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (18,false,'ordinary',NULL,NULL);

-- name: label_literals_skipped_mismatch
INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (19,true,'ordinary','wrong',-1);

-- name: label_storage_sample_0
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (1,false,'0',0,9223372036854775807);

-- name: label_storage_sample_1
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (2,false,'-0',0,9223372036854775807);

-- name: label_storage_sample_2
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (3,false,'.5 bytes',1,9223372036854775807);

-- name: label_storage_sample_3
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (4,false,'-.5 B',-1,9223372036854775807);

-- name: label_storage_sample_4
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (5,false,'1 kB',1024,9223372036854775807);

-- name: label_storage_sample_5
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (6,false,'1.5 MB',1572864,9223372036854775807);

-- name: label_storage_sample_6
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (7,false,'0.1 kB',102,9223372036854775807);

-- name: label_storage_sample_7
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (8,false,'.00048828125 kB',1,9223372036854775807);

-- name: label_storage_sample_8
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (9,false,'-.00048828125 kB',-1,9223372036854775807);

-- name: label_storage_sample_9
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (10,false,'1 GB',1073741824,9223372036854775807);

-- name: label_storage_sample_10
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (11,false,'1 TB',1099511627776,9223372036854775807);

-- name: label_storage_sample_11
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (12,false,'1 PB',1125899906842624,9223372036854775807);

-- name: label_storage_sample_12
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (13,false,'1e2',100,9223372036854775807);

-- name: label_storage_sample_13
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (14,false,'1E-3 MB',1049,9223372036854775807);

-- name: label_storage_sample_14
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (15,false,'  1.5 kB	',1536,9223372036854775807);

-- name: label_storage_sample_15
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (16,false,'9007199254740993',9007199254740993,9223372036854775807);

-- name: label_storage_sample_16
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (17,false,'9223372036854775807.4',9223372036854775807,9223372036854775807);

-- name: label_storage_sample_17
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (18,false,'-9223372036854775808.4',-9223372036854775808,9223372036854775807);

-- name: label_storage_sample_18
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (19,false,'0e1073741823',0,9223372036854775807);

-- name: label_storage_sample_19
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (20,false,'1e-16383',0,9223372036854775807);

-- name: label_storage_sample_20
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (21,false,NULL,NULL,9223372036854775807);

-- name: label_storage_wrong_bytes
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (22,false,'1 kB',1000,1024);

-- name: label_storage_exceeds_limit
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (23,false,'1 kB',1024,1023);

-- name: label_storage_null_recorded
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (24,false,'1 kB',NULL,NULL);

-- name: label_storage_invalid_0
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (25,false,'',0,0);

-- name: label_storage_invalid_1
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (26,false,'garbage',0,0);

-- name: label_storage_invalid_2
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (27,false,'1 KiB',0,0);

-- name: label_storage_invalid_3
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (28,false,'1e 2',0,0);

-- name: label_storage_invalid_4
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (29,false,'1e1073741824',0,0);

-- name: label_storage_invalid_5
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (30,false,'1e-16384',0,0);

-- name: label_storage_invalid_6
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (31,false,'9223372036854775807.5',0,0);

-- name: label_storage_invalid_7
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (32,false,'-9223372036854775808.5',0,0);

-- name: label_storage_invalid_8
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (33,false,'8192 PB',0,0);

-- name: label_storage_invalid_9
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (34,false,'1e30 invalid',0,0);

-- name: label_storage_invalid_10
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (35,false,'1e131072 invalid',0,0);

-- name: label_storage_invalid_11
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (36,false,'1 kB',0,0);

-- name: label_storage_skipped_invalid
INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (37,true,'invalid',0,0);

-- name: label_pattern_sample_0
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (1,false,'alpha','alpha','a%','\',true,false,true,false,true,false,true,false,true,false,true,true,'a%',2);

-- name: label_pattern_sample_1
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (2,false,'AbC','AbC','a_c','\',true,false,false,true,false,true,true,false,false,true,false,true,'a_c',3);

-- name: label_pattern_sample_2
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (3,false,'é😊','é😊','__','\',true,false,true,false,true,false,true,false,true,false,true,true,'__',2);

-- name: label_pattern_sample_3
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (4,false,'é','é','__','\',true,false,true,false,true,false,true,false,true,false,true,true,'__',2);

-- name: label_pattern_sample_4
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (5,false,'','','%','',true,false,true,false,true,false,true,false,true,false,true,true,'%',1);

-- name: label_pattern_sample_5
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (6,false,'','','_','',false,true,false,true,false,true,false,true,false,true,false,false,'_',1);

-- name: label_pattern_sample_6
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (7,false,'alpha','alpha','%l%h%','',true,false,true,false,true,false,true,false,true,false,true,true,'%l%h%',5);

-- name: label_pattern_sample_7
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (8,false,'alpha','alpha','%a%a%b','',false,true,false,true,false,true,false,true,false,true,false,false,'%a%a%b',6);

-- name: label_pattern_sample_8
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (9,false,'a%','a%','a\%','\',true,false,true,false,true,false,true,false,true,false,true,true,'a\%',3);

-- name: label_pattern_sample_9
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (10,false,'a_','a_','a\_','\',true,false,true,false,true,false,true,false,true,false,true,true,'a\_',3);

-- name: label_pattern_sample_10
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (11,false,'a\b','a\b','a\b','',false,true,false,true,false,true,false,true,false,true,true,true,'a\\b',4);

-- name: label_pattern_sample_11
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (12,false,'a%','a%','a!%','!',false,true,false,true,false,true,false,true,false,true,true,true,'a\%',3);

-- name: label_pattern_sample_12
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (13,false,'😊%','😊%','😊é%','é',false,true,false,true,false,true,false,true,false,true,true,true,'😊\%',6);

-- name: label_pattern_sample_13
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (14,false,'a%','a%','a😊%','😊',false,true,false,true,false,true,false,true,false,true,true,true,'a\%',3);

-- name: label_pattern_sample_14
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (15,false,'a  ','a  ','a','\',false,true,false,true,false,true,false,true,false,true,false,false,'a',1);

-- name: label_pattern_sample_15
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (16,false,'a  ','a  ','a%','\',true,false,true,false,true,false,true,false,true,false,true,true,'a%',2);

-- name: label_pattern_sample_16
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (17,false,'Ä','Ä','ä','\',false,true,false,true,false,true,false,true,false,true,false,false,'ä',2);

-- name: label_pattern_sample_17
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (18,false,'a
β','a
β','a_β','\',true,false,true,false,true,false,true,false,true,false,true,true,'a_β',4);

-- name: label_pattern_sample_18
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (19,false,NULL,NULL,'%','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'%',1);

-- name: label_pattern_sample_19
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (20,false,'a','a',NULL,'',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- name: label_pattern_sample_20
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (21,false,'a','a','%',NULL,true,false,true,false,true,false,true,false,true,false,NULL,NULL,NULL,NULL);

-- name: label_pattern_wrong_results
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (22,false,'alpha','alpha','a%','\',false,true,false,true,false,true,false,true,false,true,false,false,'wrong',-1);

-- name: label_pattern_reached_escape
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (23,false,'a','a','\','\',true,false,true,false,true,false,true,false,true,false,true,true,'a%',2);

-- name: label_pattern_escape_after_abort
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (24,false,'a','a','_\','\',false,true,false,true,false,true,false,true,false,true,false,false,'_\',2);

-- name: label_pattern_invalid_escape
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (25,false,'alpha','alpha','a%','ab',true,false,true,false,true,false,true,false,true,false,true,true,'a%',2);

-- name: label_pattern_skipped_invalid
INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (26,true,'alpha','alpha','\','invalid',true,false,true,false,true,false,true,false,true,false,true,true,'a%',2);

-- name: LabelRegexPlainMatch
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (100, false, 'abc', 'abc', 'a', '', true, true, true);

-- name: LabelRegexNoMatch
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (101, false, 'abc', 'abc', 'z', '', false, false, false);

-- name: LabelRegexCaseDifference
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (102, false, 'ABC', 'ABC', 'abc', 'i', false, true, true);

-- name: LabelRegexCaseOverride
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (103, false, 'ABC', 'ABC', 'abc', 'ic', false, true, false);

-- name: LabelRegexCaseLastWins
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (104, false, 'ABC', 'ABC', 'abc', 'ci', false, true, true);

-- name: LabelRegexBasicFlavor
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (105, false, 'aa', 'aa', 'a+', 'b', true, true, false);

-- name: LabelRegexExtendedFlagMask
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (106, false, 'aa', 'aa', 'a+', 'e', true, true, false);

-- name: LabelRegexLiteralFlavor
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (107, false, 'a+', 'a+', 'a+', 'q', true, true, true);

-- name: LabelRegexLiteralFlavorNoMatch
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (108, false, 'aaa', 'aaa', 'a+', 'q', true, true, false);

-- name: LabelRegexNewlineAnchors
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (109, false, 'a
b', 'a
b', '^b$', 'n', false, false, true);

-- name: LabelRegexNewlineDot
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (110, false, 'a
b', 'a
b', 'a.b', 'n', true, true, false);

-- name: LabelRegexNewlineStop
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (111, false, 'a
b', 'a
b', 'a.b', 'p', true, true, false);

-- name: LabelRegexNewlineAnchorsOnly
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (112, false, 'a
b', 'a
b', '^b$', 'w', false, false, true);

-- name: LabelRegexExpandedPattern
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (113, false, 'ab', 'ab', 'a # note
 b', 'x', false, false, true);

-- name: LabelRegexExpandedLastWins
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (114, false, 'ab', 'ab', 'a # note
 b', 'xt', false, false, false);

-- name: LabelRegexUnicodeScalar
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (115, false, '😊', '😊', '^.$', '', true, true, true);

-- name: LabelRegexUnicodeCNoFold
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (116, false, 'É', 'É', 'é', 'i', false, false, false);

-- name: LabelRegexTrailingBlanks
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (117, false, 'a  ', 'a  ', '^a$', '', false, false, false);

-- name: LabelRegexEmptyPattern
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (118, false, 'abc', 'abc', '', '', true, true, true);

-- name: LabelRegexEmptySubject
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (119, false, '', '', 'a', '', false, false, false);

-- name: LabelRegexBackReference
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (120, false, 'abab', 'abab', '(ab)\1', '', true, true, true);

-- name: LabelRegexWordBoundary
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (121, false, 'ab1', 'ab1', '\mab\M', '', false, false, false);

-- name: LabelRegexNullLabel
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (122, false, NULL, NULL, 'a', '', NULL, NULL, NULL);

-- name: LabelRegexNullPattern
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (123, false, 'abc', 'abc', NULL, '', NULL, NULL, NULL);

-- name: LabelRegexNullFlags
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (124, false, 'abc', 'abc', 'a', NULL, true, true, NULL);

-- name: LabelRegexNullRecord
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (125, false, 'abc', 'abc', 'a', '', NULL, NULL, NULL);

-- name: LabelRegexWrongSensitiveRecord
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (126, false, 'abc', 'abc', 'a', '', false, true, true);

-- name: LabelRegexWrongInsensitiveRecord
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (127, false, 'abc', 'abc', 'a', '', true, false, true);

-- name: LabelRegexWrongFlagRecord
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (128, false, 'abc', 'abc', 'a', '', true, true, false);

-- name: LabelRegexInvalidPattern
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (129, false, 'abc', 'abc', '(', '', false, false, false);

-- name: LabelRegexInvalidFlags
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (130, false, 'abc', 'abc', 'a', 'invalid', true, true, false);

-- name: LabelRegexForbiddenGlobal
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (131, false, 'abc', 'abc', 'a', 'g', true, true, false);

-- name: LabelRegexFlagErrorBeforePattern
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (132, false, 'abc', 'abc', '(', 'g', false, false, false);

-- name: LabelRegexNullBeforeBadFlags
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (133, false, NULL, NULL, '(', 'g', NULL, NULL, NULL);

-- name: LabelRegexSkippedPatternError
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (134, true, 'abc', 'abc', '(', '', false, false, false);

-- name: LabelRegexSkippedFlagError
INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged)
VALUES (135, true, 'abc', 'abc', 'a', 'g', false, false, false);

-- name: LabelRegexcountOrdinary
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (100, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountWrongRecorded2
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (101, false, 'abc abc', 'a', 1, '', 0, 2, 2);

-- name: LabelRegexcountWrongRecorded3
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (102, false, 'abc abc', 'a', 1, '', 2, 0, 2);

-- name: LabelRegexcountWrongRecorded4
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (103, false, 'abc abc', 'a', 1, '', 2, 2, 0);

-- name: LabelRegexcountNullRecords
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (104, false, 'abc abc', 'a', 1, '', NULL, NULL, NULL);

-- name: LabelRegexcountSecondMatch
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (105, false, 'abc abc', '(a)', 1, '', 2, 2, 2);

-- name: LabelRegexcountUnicodePositions
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (106, false, '😊a😊a', 'a', 2, '', 2, 2, 2);

-- name: LabelRegexcountOptionalCaptureMissing
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (107, false, 'b ab', '(a)?b', 1, '', 2, 2, 2);

-- name: LabelRegexcountAlternativeCapture
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (108, false, 'ab', '(a)|(b)', 1, '', 2, 2, 2);

-- name: LabelRegexcountNestedCapture
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (109, false, 'xabx', '(a(b))', 1, '', 1, 1, 1);

-- name: LabelRegexcountWholeWithoutCaptures
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (110, false, 'abc', 'b', 1, '', 1, 1, 1);

-- name: LabelRegexcountNoncapturingGroup
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (111, false, 'abc', '(?:b)', 1, '', 1, 1, 1);

-- name: LabelRegexcountEmptyPattern
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (112, false, 'abc', '', 2, '', 4, 3, 3);

-- name: LabelRegexcountZeroLengthProgress
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (113, false, 'baab', 'a*', 1, '', 4, 4, 4);

-- name: LabelRegexcountEmptySubject
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (114, false, '', '', 1, '', 1, 1, 1);

-- name: LabelRegexcountNoMatch
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (115, false, 'abc abc', 'z', 1, '', 0, 0, 0);

-- name: LabelRegexcountPastEnd
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (116, false, 'abc', '', 20, '', 4, 0, 0);

-- name: LabelRegexcountMaximumStart
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (117, false, 'abc abc', 'a', 2147483647, '', 2, 0, 0);

-- name: LabelRegexcountMaximumOccurrence
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (118, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountMaximumCapture
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (119, false, 'abc abc', '(a)', 1, '', 2, 2, 2);

-- name: LabelRegexcountAsciiInsensitive
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (120, false, 'AaA', 'a', 1, 'i', 1, 1, 3);

-- name: LabelRegexcountNewlineFlags
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (121, false, 'a
b', '^b$', 1, 'n', 0, 0, 1);

-- name: LabelRegexcountLiteralFlags
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (122, false, 'a+a+', 'a+', 1, 'q', 2, 2, 2);

-- name: LabelRegexcountBasicFlags
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (123, false, 'aa', 'a+', 1, 'b', 1, 1, 0);

-- name: LabelRegexcountExtendedMask
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (124, false, 'aa', 'a+', 1, 'e', 1, 1, 0);

-- name: LabelRegexcountInvalidPattern
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (125, false, 'abc abc', '(', 1, '', NULL, NULL, NULL);

-- name: LabelRegexcountInvalidFlags
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (126, false, 'abc abc', 'a', 1, 'invalid', 2, 2, NULL);

-- name: LabelRegexcountGlobalRejected
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (127, false, 'abc abc', 'a', 1, 'g', 2, 2, NULL);

-- name: LabelRegexcountZeroStart
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (128, false, 'abc abc', '(', 0, '', NULL, NULL, NULL);

-- name: LabelRegexcountMinimumStart
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (129, false, 'abc abc', 'a', -2147483648, '', 2, NULL, NULL);

-- name: LabelRegexcountZeroOccurrence
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (130, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountNegativeOccurrence
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (131, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountInvalidEndOption
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (132, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountNegativeCapture
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (133, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountNullLabel
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (134, false, NULL, '(', 0, 'g', NULL, NULL, NULL);

-- name: LabelRegexcountNullPattern
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (135, false, 'abc abc', NULL, 0, 'g', NULL, NULL, NULL);

-- name: LabelRegexcountNullStart
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (136, false, 'abc abc', 'a', NULL, '', 2, NULL, NULL);

-- name: LabelRegexcountNullOccurrence
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (137, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountNullEndOption
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (138, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountNullFlags
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (139, false, 'abc abc', 'a', 1, NULL, 2, 2, NULL);

-- name: LabelRegexcountNullCapture
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (140, false, 'abc abc', 'a', 1, '', 2, 2, 2);

-- name: LabelRegexcountSkippedErrors
INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4)
VALUES (141, true, 'abc abc', '(', 0, 'g', NULL, NULL, NULL);

-- name: LabelRegexpositionOrdinary
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (100, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 1, 1, 1, 1, 1);

-- name: LabelRegexpositionWrongRecorded2
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (101, false, 'abc abc', 'a', 1, 1, 0, '', 0, 0, 1, 1, 1, 1, 1);

-- name: LabelRegexpositionWrongRecorded3
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (102, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 0, 1, 1, 1, 1);

-- name: LabelRegexpositionWrongRecorded4
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (103, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 1, 0, 1, 1, 1);

-- name: LabelRegexpositionWrongRecorded5
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (104, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 1, 1, 0, 1, 1);

-- name: LabelRegexpositionWrongRecorded6
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (105, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 1, 1, 1, 0, 1);

-- name: LabelRegexpositionWrongRecorded7
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (106, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 1, 1, 1, 1, 0);

-- name: LabelRegexpositionNullRecords
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (107, false, 'abc abc', 'a', 1, 1, 0, '', 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionSecondMatch
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (108, false, 'abc abc', '(a)', 1, 2, 1, '', 1, 1, 1, 5, 6, 6, 6);

-- name: LabelRegexpositionUnicodePositions
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (109, false, '😊a😊a', 'a', 2, 2, 1, '', 1, 2, 2, 4, 5, 5, 5);

-- name: LabelRegexpositionOptionalCaptureMissing
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (110, false, 'b ab', '(a)?b', 1, 1, 0, '', 1, 1, 1, 1, 1, 1, 0);

-- name: LabelRegexpositionAlternativeCapture
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (111, false, 'ab', '(a)|(b)', 1, 2, 1, '', 1, 1, 1, 2, 3, 3, 0);

-- name: LabelRegexpositionNestedCapture
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (112, false, 'xabx', '(a(b))', 1, 1, 0, '', 2, 2, 2, 2, 2, 2, 3);

-- name: LabelRegexpositionWholeWithoutCaptures
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (113, false, 'abc', 'b', 1, 1, 1, '', 1, 2, 2, 2, 3, 3, 3);

-- name: LabelRegexpositionNoncapturingGroup
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (114, false, 'abc', '(?:b)', 1, 1, 0, '', 1, 2, 2, 2, 2, 2, 2);

-- name: LabelRegexpositionEmptyPattern
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (115, false, 'abc', '', 2, 2, 1, '', 0, 1, 2, 3, 3, 3, 3);

-- name: LabelRegexpositionZeroLengthProgress
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (116, false, 'baab', 'a*', 1, 3, 1, '', 1, 1, 1, 4, 4, 4, 4);

-- name: LabelRegexpositionEmptySubject
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (117, false, '', '', 1, 1, 0, '', 0, 1, 1, 1, 1, 1, 1);

-- name: LabelRegexpositionNoMatch
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (118, false, 'abc abc', 'z', 1, 1, 0, '', 0, 0, 0, 0, 0, 0, 0);

-- name: LabelRegexpositionPastEnd
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (119, false, 'abc', '', 20, 1, 0, '', 0, 1, 0, 0, 0, 0, 0);

-- name: LabelRegexpositionMaximumStart
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (120, false, 'abc abc', 'a', 2147483647, 1, 0, '', 0, 1, 0, 0, 0, 0, 0);

-- name: LabelRegexpositionMaximumOccurrence
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (121, false, 'abc abc', 'a', 1, 2147483647, 0, '', 0, 1, 1, 0, 0, 0, 0);

-- name: LabelRegexpositionMaximumCapture
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (122, false, 'abc abc', '(a)', 1, 1, 0, '', 2147483647, 1, 1, 1, 1, 1, 0);

-- name: LabelRegexpositionAsciiInsensitive
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (123, false, 'AaA', 'a', 1, 2, 0, 'i', 0, 2, 2, 0, 0, 2, 2);

-- name: LabelRegexpositionNewlineFlags
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (124, false, 'a
b', '^b$', 1, 1, 0, 'n', 0, 0, 0, 0, 0, 3, 3);

-- name: LabelRegexpositionLiteralFlags
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (125, false, 'a+a+', 'a+', 1, 2, 1, 'q', 1, 1, 1, 3, 4, 5, 5);

-- name: LabelRegexpositionBasicFlags
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (126, false, 'aa', 'a+', 1, 1, 0, 'b', 0, 1, 1, 1, 1, 0, 0);

-- name: LabelRegexpositionExtendedMask
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (127, false, 'aa', 'a+', 1, 1, 0, 'e', 0, 1, 1, 1, 1, 0, 0);

-- name: LabelRegexpositionInvalidPattern
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (128, false, 'abc abc', '(', 1, 1, 0, '', 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionInvalidFlags
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (129, false, 'abc abc', 'a', 1, 1, 0, 'invalid', 0, 1, 1, 1, 1, NULL, NULL);

-- name: LabelRegexpositionGlobalRejected
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (130, false, 'abc abc', 'a', 1, 1, 0, 'g', 0, 1, 1, 1, 1, NULL, NULL);

-- name: LabelRegexpositionZeroStart
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (131, false, 'abc abc', '(', 0, 1, 0, '', 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionMinimumStart
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (132, false, 'abc abc', 'a', -2147483648, 1, 0, '', 0, 1, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionZeroOccurrence
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (133, false, 'abc abc', 'a', 1, 0, 0, '', 0, 1, 1, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionNegativeOccurrence
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (134, false, 'abc abc', 'a', 1, -1, 0, '', 0, 1, 1, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionInvalidEndOption
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (135, false, 'abc abc', 'a', 1, 1, 2, '', 0, 1, 1, 1, NULL, NULL, NULL);

-- name: LabelRegexpositionNegativeCapture
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (136, false, 'abc abc', 'a', 1, 1, 0, '', -1, 1, 1, 1, 1, 1, NULL);

-- name: LabelRegexpositionNullLabel
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (137, false, NULL, '(', 0, 0, 2, 'g', -1, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionNullPattern
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (138, false, 'abc abc', NULL, 0, 0, 2, 'g', -1, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionNullStart
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (139, false, 'abc abc', 'a', NULL, 1, 0, '', 0, 1, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionNullOccurrence
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (140, false, 'abc abc', 'a', 1, NULL, 0, '', 0, 1, 1, NULL, NULL, NULL, NULL);

-- name: LabelRegexpositionNullEndOption
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (141, false, 'abc abc', 'a', 1, 1, NULL, '', 0, 1, 1, 1, NULL, NULL, NULL);

-- name: LabelRegexpositionNullFlags
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (142, false, 'abc abc', 'a', 1, 1, 0, NULL, 0, 1, 1, 1, 1, NULL, NULL);

-- name: LabelRegexpositionNullCapture
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (143, false, 'abc abc', 'a', 1, 1, 0, '', NULL, 1, 1, 1, 1, 1, NULL);

-- name: LabelRegexpositionSkippedErrors
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7)
VALUES (144, true, 'abc abc', '(', 0, 0, 2, 'g', -1, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractOrdinary
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (100, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a', 'a', 'a');

-- name: LabelRegexextractWrongRecorded2
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (101, false, 'abc abc', 'a', 1, 1, '', 0, 'a!', 'a', 'a', 'a', 'a');

-- name: LabelRegexextractWrongRecorded3
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (102, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a!', 'a', 'a', 'a');

-- name: LabelRegexextractWrongRecorded4
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (103, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a!', 'a', 'a');

-- name: LabelRegexextractWrongRecorded5
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (104, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a', 'a!', 'a');

-- name: LabelRegexextractWrongRecorded6
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (105, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a', 'a', 'a!');

-- name: LabelRegexextractNullRecords
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (106, false, 'abc abc', 'a', 1, 1, '', 0, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractSecondMatch
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (107, false, 'abc abc', '(a)', 1, 2, '', 1, 'a', 'a', 'a', 'a', 'a');

-- name: LabelRegexextractUnicodePositions
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (108, false, '😊a😊a', 'a', 2, 2, '', 1, 'a', 'a', 'a', 'a', 'a');

-- name: LabelRegexextractOptionalCaptureMissing
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (109, false, 'b ab', '(a)?b', 1, 1, '', 1, 'b', 'b', 'b', 'b', NULL);

-- name: LabelRegexextractAlternativeCapture
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (110, false, 'ab', '(a)|(b)', 1, 2, '', 1, 'a', 'a', 'b', 'b', NULL);

-- name: LabelRegexextractNestedCapture
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (111, false, 'xabx', '(a(b))', 1, 1, '', 2, 'ab', 'ab', 'ab', 'ab', 'b');

-- name: LabelRegexextractWholeWithoutCaptures
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (112, false, 'abc', 'b', 1, 1, '', 1, 'b', 'b', 'b', 'b', 'b');

-- name: LabelRegexextractNoncapturingGroup
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (113, false, 'abc', '(?:b)', 1, 1, '', 1, 'b', 'b', 'b', 'b', 'b');

-- name: LabelRegexextractEmptyPattern
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (114, false, 'abc', '', 2, 2, '', 0, '', '', '', '', '');

-- name: LabelRegexextractZeroLengthProgress
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (115, false, 'baab', 'a*', 1, 3, '', 1, '', '', '', '', '');

-- name: LabelRegexextractEmptySubject
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (116, false, '', '', 1, 1, '', 0, '', '', '', '', '');

-- name: LabelRegexextractNoMatch
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (117, false, 'abc abc', 'z', 1, 1, '', 0, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractPastEnd
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (118, false, 'abc', '', 20, 1, '', 0, '', NULL, NULL, NULL, NULL);

-- name: LabelRegexextractMaximumStart
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (119, false, 'abc abc', 'a', 2147483647, 1, '', 0, 'a', NULL, NULL, NULL, NULL);

-- name: LabelRegexextractMaximumOccurrence
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (120, false, 'abc abc', 'a', 1, 2147483647, '', 0, 'a', 'a', NULL, NULL, NULL);

-- name: LabelRegexextractMaximumCapture
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (121, false, 'abc abc', '(a)', 1, 1, '', 2147483647, 'a', 'a', 'a', 'a', NULL);

-- name: LabelRegexextractAsciiInsensitive
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (122, false, 'AaA', 'a', 1, 2, 'i', 0, 'a', 'a', NULL, 'a', 'a');

-- name: LabelRegexextractNewlineFlags
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (123, false, 'a
b', '^b$', 1, 1, 'n', 0, NULL, NULL, NULL, 'b', 'b');

-- name: LabelRegexextractLiteralFlags
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (124, false, 'a+a+', 'a+', 1, 2, 'q', 1, 'a', 'a', 'a', 'a+', 'a+');

-- name: LabelRegexextractBasicFlags
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (125, false, 'aa', 'a+', 1, 1, 'b', 0, 'aa', 'aa', 'aa', NULL, NULL);

-- name: LabelRegexextractExtendedMask
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (126, false, 'aa', 'a+', 1, 1, 'e', 0, 'aa', 'aa', 'aa', NULL, NULL);

-- name: LabelRegexextractInvalidPattern
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (127, false, 'abc abc', '(', 1, 1, '', 0, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractInvalidFlags
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (128, false, 'abc abc', 'a', 1, 1, 'invalid', 0, 'a', 'a', 'a', NULL, NULL);

-- name: LabelRegexextractGlobalRejected
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (129, false, 'abc abc', 'a', 1, 1, 'g', 0, 'a', 'a', 'a', NULL, NULL);

-- name: LabelRegexextractZeroStart
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (130, false, 'abc abc', '(', 0, 1, '', 0, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractMinimumStart
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (131, false, 'abc abc', 'a', -2147483648, 1, '', 0, 'a', NULL, NULL, NULL, NULL);

-- name: LabelRegexextractZeroOccurrence
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (132, false, 'abc abc', 'a', 1, 0, '', 0, 'a', 'a', NULL, NULL, NULL);

-- name: LabelRegexextractNegativeOccurrence
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (133, false, 'abc abc', 'a', 1, -1, '', 0, 'a', 'a', NULL, NULL, NULL);

-- name: LabelRegexextractInvalidEndOption
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (134, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a', 'a', 'a');

-- name: LabelRegexextractNegativeCapture
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (135, false, 'abc abc', 'a', 1, 1, '', -1, 'a', 'a', 'a', 'a', NULL);

-- name: LabelRegexextractNullLabel
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (136, false, NULL, '(', 0, 0, 'g', -1, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractNullPattern
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (137, false, 'abc abc', NULL, 0, 0, 'g', -1, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexextractNullStart
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (138, false, 'abc abc', 'a', NULL, 1, '', 0, 'a', NULL, NULL, NULL, NULL);

-- name: LabelRegexextractNullOccurrence
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (139, false, 'abc abc', 'a', 1, NULL, '', 0, 'a', 'a', NULL, NULL, NULL);

-- name: LabelRegexextractNullEndOption
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (140, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a', 'a', 'a');

-- name: LabelRegexextractNullFlags
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (141, false, 'abc abc', 'a', 1, 1, NULL, 0, 'a', 'a', 'a', NULL, NULL);

-- name: LabelRegexextractNullCapture
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (142, false, 'abc abc', 'a', 1, 1, '', NULL, 'a', 'a', 'a', 'a', NULL);

-- name: LabelRegexextractSkippedErrors
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6)
VALUES (143, true, 'abc abc', '(', 0, 0, 'g', -1, NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexreplacementOrdinary
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (100, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc');

-- name: LabelRegexreplacementWrongRecordedregexp_replace_q5ba
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (101, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc!', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc');

-- name: LabelRegexreplacementWrongRecordedregexp_replace_7z9g
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (102, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc', 'Xbc abc!', 'Xbc abc', 'Xbc abc', 'Xbc abc');

-- name: LabelRegexreplacementWrongRecordedregexp_replace_ohuj
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (103, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc', 'Xbc abc', 'Xbc abc!', 'Xbc abc', 'Xbc abc');

-- name: LabelRegexreplacementWrongRecordedregexp_replace_j9on
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (104, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc!', 'Xbc abc');

-- name: LabelRegexreplacementWrongRecordedregexp_replace_3spp
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (105, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc!');

-- name: LabelRegexreplacementNullRecords
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (106, false, 'abc abc', 'a', 'X', 1, 1, '', NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexreplacementGlobal
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (107, false, 'abc abc', 'a', 'X', 1, 1, 'g', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc Xbc');

-- name: LabelRegexreplacementAllOccurrences
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (108, false, 'abc abc', 'a', 'X', 1, 0, '', 'Xbc abc', 'Xbc abc', 'Xbc Xbc', 'Xbc Xbc', 'Xbc abc');

-- name: LabelRegexreplacementGlobalDoesNotOverrideNth
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (109, false, 'abc abc', 'a', 'X', 1, 2, 'g', 'Xbc abc', 'Xbc abc', 'abc Xbc', 'abc Xbc', 'Xbc Xbc');

-- name: LabelRegexreplacementStartAtSecond
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (110, false, 'abc abc', 'a', 'X', 4, 1, '', 'Xbc abc', 'abc Xbc', 'abc Xbc', 'abc Xbc', 'Xbc abc');

-- name: LabelRegexreplacementNoThird
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (111, false, 'abc abc', 'a', 'X', 1, 3, '', 'Xbc abc', 'Xbc abc', 'abc abc', 'abc abc', 'Xbc abc');

-- name: LabelRegexreplacementMaximumStart
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (112, false, 'abc abc', 'a', 'X', 2147483647, 1, '', 'Xbc abc', 'abc abc', 'abc abc', 'abc abc', 'Xbc abc');

-- name: LabelRegexreplacementMaximumOccurrence
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (113, false, 'abc abc', 'a', 'X', 1, 2147483647, '', 'Xbc abc', 'Xbc abc', 'abc abc', 'abc abc', 'Xbc abc');

-- name: LabelRegexreplacementUnicodeCaptures
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (114, false, '😊a😊a', '(😊)(a)', '<\2\1>', 1, 2, 'g', '<a😊>😊a', '<a😊>😊a', '😊a<a😊>', '😊a<a😊>', '<a😊><a😊>');

-- name: LabelRegexreplacementWholeReference
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (115, false, 'abc abc', 'a', '<\&>', 1, 1, 'g', '<a>bc abc', '<a>bc abc', '<a>bc abc', '<a>bc abc', '<a>bc <a>bc');

-- name: LabelRegexreplacementMissingGroup
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (116, false, 'abc abc', 'a', '<\9>', 1, 1, '', '<>bc abc', '<>bc abc', '<>bc abc', '<>bc abc', '<>bc abc');

-- name: LabelRegexreplacementOptionalCapture
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (117, false, 'b ab', '(a)?b', '<\1>', 1, 0, 'g', '<> ab', '<> ab', '<> <a>', '<> <a>', '<> <a>');

-- name: LabelRegexreplacementLiteralBackslash
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (118, false, 'abc abc', 'a', '\\', 1, 1, '', '\bc abc', '\bc abc', '\bc abc', '\bc abc', '\bc abc');

-- name: LabelRegexreplacementUnknownEscape
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (119, false, 'abc abc', 'a', '\z', 1, 1, '', '\zbc abc', '\zbc abc', '\zbc abc', '\zbc abc', '\zbc abc');

-- name: LabelRegexreplacementZeroEscape
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (120, false, 'abc abc', 'a', '\0', 1, 1, '', '\0bc abc', '\0bc abc', '\0bc abc', '\0bc abc', '\0bc abc');

-- name: LabelRegexreplacementTrailingEscape
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (121, false, 'abc abc', 'a', 'end\', 1, 1, '', 'end\bc abc', 'end\bc abc', 'end\bc abc', 'end\bc abc', 'end\bc abc');

-- name: LabelRegexreplacementEmptyReplacement
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (122, false, 'abc abc', 'a', '', 1, 1, '', 'bc abc', 'bc abc', 'bc abc', 'bc abc', 'bc abc');

-- name: LabelRegexreplacementEmptyPattern
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (123, false, 'abc abc', '', 'X', 1, 0, 'g', 'Xabc abc', 'Xabc abc', 'XaXbXcX XaXbXcX', 'XaXbXcX XaXbXcX', 'XaXbXcX XaXbXcX');

-- name: LabelRegexreplacementEmptySubject
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (124, false, '', '', 'X', 1, 0, 'g', 'X', 'X', 'X', 'X', 'X');

-- name: LabelRegexreplacementZeroLengthProgress
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (125, false, 'baab', 'a*', 'X', 1, 0, 'g', 'Xbaab', 'Xbaab', 'XbXXbX', 'XbXXbX', 'XbXXbX');

-- name: LabelRegexreplacementNoMatch
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (126, false, 'abc abc', 'z', 'X', 1, 1, '', 'abc abc', 'abc abc', 'abc abc', 'abc abc', 'abc abc');

-- name: LabelRegexreplacementCaseFlags
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (127, false, 'AaA', 'a', 'X', 1, 0, 'gi', 'AXA', 'AXA', 'AXA', 'XXX', 'XXX');

-- name: LabelRegexreplacementLiteralFlags
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (128, false, 'a+a+', 'a+', 'X', 1, 0, 'qg', 'X+a+', 'X+a+', 'X+X+', 'XX', 'XX');

-- name: LabelRegexreplacementBasicFlags
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (129, false, 'aa', 'a+', 'X', 1, 1, 'b', 'X', 'X', 'X', 'aa', 'aa');

-- name: LabelRegexreplacementExtendedMask
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (130, false, 'aa', 'a+', 'X', 1, 1, 'e', 'X', 'X', 'X', 'aa', 'aa');

-- name: LabelRegexreplacementInvalidPattern
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (131, false, 'abc abc', '(', 'X', 1, 1, '', NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexreplacementInvalidFlags
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (132, false, 'abc abc', 'a', 'X', 1, 1, 'invalid', 'Xbc abc', 'Xbc abc', 'Xbc abc', NULL, NULL);

-- name: LabelRegexreplacementNumericFlags
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (133, false, 'abc abc', 'a', 'X', 1, 1, '2', 'Xbc abc', 'Xbc abc', 'Xbc abc', NULL, NULL);

-- name: LabelRegexreplacementZeroStart
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (134, false, 'abc abc', 'a', 'X', 0, 1, '', 'Xbc abc', NULL, NULL, NULL, 'Xbc abc');

-- name: LabelRegexreplacementMinimumStart
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (135, false, 'abc abc', 'a', 'X', -2147483648, 1, '', 'Xbc abc', NULL, NULL, NULL, 'Xbc abc');

-- name: LabelRegexreplacementNegativeOccurrence
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (136, false, 'abc abc', 'a', 'X', 1, -1, '', 'Xbc abc', 'Xbc abc', NULL, NULL, 'Xbc abc');

-- name: LabelRegexreplacementNullLabel
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (137, false, NULL, '(', 'X', 0, -1, 'invalid', NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexreplacementNullPattern
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (138, false, 'abc abc', NULL, 'X', 0, -1, 'invalid', NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexreplacementNullReplacement
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (139, false, 'abc abc', '(', NULL, 0, -1, 'invalid', NULL, NULL, NULL, NULL, NULL);

-- name: LabelRegexreplacementNullStart
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (140, false, 'abc abc', 'a', 'X', NULL, 1, '', 'Xbc abc', NULL, NULL, NULL, 'Xbc abc');

-- name: LabelRegexreplacementNullOccurrence
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (141, false, 'abc abc', 'a', 'X', 1, NULL, '', 'Xbc abc', 'Xbc abc', NULL, NULL, 'Xbc abc');

-- name: LabelRegexreplacementNullFlags
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (142, false, 'abc abc', 'a', 'X', 1, 1, NULL, 'Xbc abc', 'Xbc abc', 'Xbc abc', NULL, NULL);

-- name: LabelRegexreplacementSkippedErrors
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp)
VALUES (143, true, 'abc abc', '(', 'X', 0, -1, 'invalid', NULL, NULL, NULL, NULL, NULL);

-- name: LabelPatternConversionOrdinary
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (100, false, 'abc', '\', '^(?:abc)$', '^(?:abc)$');

-- name: LabelPatternConversionWrongDefault
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (101, false, 'abc', '\', '^(?:abc)$!', '^(?:abc)$');

-- name: LabelPatternConversionWrongEscaped
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (102, false, 'abc', '\', '^(?:abc)$', '^(?:abc)$!');

-- name: LabelPatternConversionNullRecorded
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (103, false, 'abc', '\', NULL, NULL);

-- name: LabelPatternConversionWildcards
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (104, false, '%a_c%', '\', '^(?:.*a.c.*)$', '^(?:.*a.c.*)$');

-- name: LabelPatternConversionAlternatives
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (105, false, '(a|b)%', '\', '^(?:(?:a|b).*)$', '^(?:(?:a|b).*)$');

-- name: LabelPatternConversionLiteralMetacharacters
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (106, false, '^a.b$', '\', '^(?:\^a\.b\$)$', '^(?:\^a\.b\$)$');

-- name: LabelPatternConversionBackslashMiddle
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (107, false, '%\"a%\"%', '\', '^(?:.*){1,1}?(a.*){1,1}(?:.*)$', '^(?:.*){1,1}?(a.*){1,1}(?:.*)$');

-- name: LabelPatternConversionQuotedMiddle
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (108, false, '%#"a%#"%', '#', '^(?:.*#"a.*#".*)$', '^(?:.*){1,1}?(a.*){1,1}(?:.*)$');

-- name: LabelPatternConversionUnicodeMiddle
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (109, false, '%😊"a%😊"%', '😊', '^(?:.*😊"a.*😊".*)$', '^(?:.*){1,1}?(a.*){1,1}(?:.*)$');

-- name: LabelPatternConversionNoEscape
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (110, false, 'a.b\%', '', '^(?:a\.b\%)$', '^(?:a\.b\\.*)$');

-- name: LabelPatternConversionLeadingBracket
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (111, false, '[]a]%', '\', '^(?:[]a].*)$', '^(?:[]a].*)$');

-- name: LabelPatternConversionNegatedBracket
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (112, false, '[^]a]%', '\', '^(?:[^]a].*)$', '^(?:[^]a].*)$');

-- name: LabelPatternConversionCharacterClass
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (113, false, '[[:alpha:]]%', '\', '^(?:[[:alpha:]].*)$', '^(?:[[:alpha:]].*)$');

-- name: LabelPatternConversionQuotedBracket
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (114, false, '[\"]%', '\', '^(?:[\"].*)$', '^(?:[\"].*)$');

-- name: LabelPatternConversionMultibyteBracket
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (115, false, '[é😊]%', 'é', '^(?:[é😊].*)$', '^(?:[\😊]%)$');

-- name: LabelPatternConversionEmptyPattern
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (116, false, '', '\', '^(?:)$', '^(?:)$');

-- name: LabelPatternConversionTrailingEscape
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (117, false, 'abc\', '\', '^(?:abc)$', '^(?:abc)$');

-- name: LabelPatternConversionInvalidEscape
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (118, false, 'abc', 'ab', '^(?:abc)$', NULL);

-- name: LabelPatternConversionInvalidUnicodeEscape
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (119, false, 'abc', 'é😊', '^(?:abc)$', NULL);

-- name: LabelPatternConversionTooManyQuotes
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (120, false, '\"a\"b\"', '\', NULL, NULL);

-- name: LabelPatternConversionNullPattern
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (121, false, NULL, 'ab', NULL, NULL);

-- name: LabelPatternConversionNullEscape
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (122, false, '%a%', NULL, '^(?:.*a.*)$', NULL);

-- name: LabelPatternConversionSkippedErrors
INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (123, true, '\"a\"b\"', 'ab', NULL, NULL);

-- name: ascii_latin1_utf8_bytes
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 8, 'AC    ', 6, false);
-- name: ascii_latin2_utf8_bytes
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 9, 'ASd   ', 6, false);
-- name: ascii_latin9_utf8_bytes
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 16, 'AC    ', 6, false);
-- name: ascii_win1250_utf8_bytes
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 29, 'ACdz S', 6, false);
-- name: ascii_preserves_printable_bytes
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'Export 123', 8, 'Export 123', 10, false);
-- name: ascii_empty_text
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, '', 29, '', 0, false);
-- name: ascii_rejects_transliteration
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é', 8, 'e', 2, false);
-- name: ascii_rejects_wrong_byte_count
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 8, 'AC    ', 5, false);
-- name: ascii_rejects_different_table_result
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 9, 'AC    ', 6, false);
-- name: ascii_invalid_negative_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'Export', -1, 'Export', 6, false);
-- name: ascii_invalid_high_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'Export', 42, 'Export', 6, false);
-- name: ascii_unsupported_utf8_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'Export', 6, 'Export', 6, false);
-- name: ascii_unsupported_sql_ascii_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, '', 0, '', 0, false);
-- name: ascii_null_label_bypasses_invalid_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, NULL, -1, 'ignored', 9, false);
-- name: ascii_null_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', NULL, 'ignored', 9, false);
-- name: ascii_skips_invalid_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', -1, 'ignored', 0, true);
-- name: ascii_skips_unsupported_encoding
INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets, suppress_invalid) VALUES (2, 'é😊', 6, 'ignored', 0, true);
-- name: ascii_default_null
INSERT INTO label_default_ascii_exports (id, label, ascii_label, suppress_invalid) VALUES (2, NULL, 'ignored', false);
-- name: ascii_default_utf8_unsupported
INSERT INTO label_default_ascii_exports (id, label, ascii_label, suppress_invalid) VALUES (2, 'Export', 'Export', false);
-- name: ascii_default_empty_utf8_unsupported
INSERT INTO label_default_ascii_exports (id, label, ascii_label, suppress_invalid) VALUES (2, '', '', false);
-- name: ascii_default_skips_conversion
INSERT INTO label_default_ascii_exports (id, label, ascii_label, suppress_invalid) VALUES (2, 'é😊', 'ignored', true);

-- name: unicode_escape_plain_four_digits
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\0041', 'A', 1, false);
-- name: unicode_escape_lowercase_prefix
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u00e9', 'é', 2, false);
-- name: unicode_escape_six_digits
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\+01F60A', '😊', 4, false);
-- name: unicode_escape_eight_digits
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\U0001F60A', '😊', 4, false);
-- name: unicode_escape_mixed_surrogate_pair
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\D83D\U0000DE0A', '😊', 4, false);
-- name: unicode_escape_last_scalar
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\DBFF\DFFF', '􏿿', 4, false);
-- name: unicode_escape_doubled_backslash
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, 'path\\file', 'path\file', 9, false);
-- name: unicode_escape_literal_backslash_prefix
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\\u0041', '\u0041', 6, false);
-- name: unicode_escape_plain_multibyte_text
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '日\u0041😊', '日A😊', 8, false);
-- name: unicode_escape_empty_label
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '', '', 0, false);
-- name: unicode_escape_preserves_decomposition
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u0041\u0301', 'Á', 3, false);
-- name: unicode_escape_rejects_different_label
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u0041', 'B', 1, false);
-- name: unicode_escape_rejects_different_octets
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u00E9', 'é', 1, false);
-- name: unicode_escape_rejects_normalized_label
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u0041\u0301', 'Á', 3, false);
-- name: unicode_escape_short_digits
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u123', NULL, NULL, false);
-- name: unicode_escape_missing_second_surrogate
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\D800', NULL, NULL, false);
-- name: unicode_escape_unpaired_low_surrogate
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\DC00', NULL, NULL, false);
-- name: unicode_escape_null_code_point
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\u0000', NULL, NULL, false);
-- name: unicode_escape_exceeds_scalar_range
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\U00110000', NULL, NULL, false);
-- name: unicode_escape_full_unsigned_range
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\UFFFFFFFF', NULL, NULL, false);
-- name: unicode_escape_nonhex_after_large_digits
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\UFFFFFFFG', NULL, NULL, false);
-- name: unicode_escape_pending_surrogate_null_code_point
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\D800\u0000', NULL, NULL, false);
-- name: unicode_escape_null_input
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, NULL, 'ignored', 9, false);
-- name: unicode_escape_skip_syntax_error
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\D800', 'ignored', 0, true);
-- name: unicode_escape_skip_code_point_error
INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets, suppress_invalid) VALUES (2, '\UFFFFFFFF', 'ignored', 0, true);

-- name: normalization_composed_accent
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', false, false, true, '16.0', '16.0', false);
-- name: normalization_decomposed_accent
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFD', 'Café', 'Café', false, true, true, '16.0', '16.0', false);
-- name: normalization_compatibility_ligature
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'ﬁ', 'NFKC', 'fi', 'ﬁ', false, true, true, '16.0', '16.0', false);
-- name: normalization_compatibility_digits
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '²', 'nfkd', '2', '²', false, true, true, '16.0', '16.0', false);
-- name: normalization_hangul
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '각', 'NFC', '각', '각', false, false, true, '16.0', '16.0', false);
-- name: normalization_combining_order
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'À̕', 'NFD', 'À̕', 'À̕', false, false, true, '16.0', '16.0', false);
-- name: normalization_unassigned
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '͸', 'NFC', '͸', '͸', true, true, false, '16.0', '16.0', false);
-- name: normalization_noncharacter
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '﷐', 'NFC', '﷐', '﷐', true, true, false, '16.0', '16.0', false);
-- name: normalization_private_use
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '', 'NFC', '', '', true, true, true, '16.0', '16.0', false);
-- name: normalization_astral
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '😊', 'NFC', '😊', '😊', true, true, true, '16.0', '16.0', false);
-- name: normalization_empty
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, '', 'NFC', '', '', true, true, true, '16.0', '16.0', false);
-- name: normalization_wrong_text
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Cafe', 'Café', false, false, true, '16.0', '16.0', false);
-- name: normalization_wrong_default_text
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', false, false, true, '16.0', '16.0', false);
-- name: normalization_wrong_state
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', true, false, true, '16.0', '16.0', false);
-- name: normalization_wrong_default_state
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', false, true, true, '16.0', '16.0', false);
-- name: normalization_wrong_assignment
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', false, false, false, '16.0', '16.0', false);
-- name: normalization_wrong_database_version
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', false, false, true, 'incorrect', '16.0', false);
-- name: normalization_wrong_icu_version
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', 'Café', 'Café', false, false, true, '16.0', 'incorrect', false);
-- name: normalization_null_label
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, NULL, 'NFC', 'ignored', 'ignored', true, true, true, '16.0', '16.0', false);
-- name: normalization_null_form
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', NULL, 'ignored', 'Café', true, false, true, '16.0', '16.0', false);
-- name: normalization_null_expectations
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false);
-- name: normalization_invalid_form
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'invalid', NULL, 'Café', NULL, false, true, '16.0', '16.0', false);
-- name: normalization_space_in_form
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'NFC ', NULL, 'Café', NULL, false, true, '16.0', '16.0', false);
-- name: normalization_null_skips_invalid_form
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, NULL, 'invalid', 'ignored', 'ignored', false, false, true, '16.0', '16.0', false);
-- name: normalization_lazy_invalid_form
INSERT INTO label_normalization_records (id, label, normal_form, normalized_label, nfc_label, recorded_normalized, recorded_nfc, recorded_assigned, recorded_unicode_version, recorded_icu_version, suppress_invalid) VALUES (2, 'Café', 'invalid', 'ignored', 'ignored', false, false, true, 'ignored', 'ignored', true);
