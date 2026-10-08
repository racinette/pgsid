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
