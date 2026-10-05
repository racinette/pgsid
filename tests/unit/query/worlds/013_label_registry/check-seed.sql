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
