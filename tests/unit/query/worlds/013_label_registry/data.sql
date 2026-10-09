INSERT INTO label_pairs (id, short_label, reference_label) VALUES (1, 'alpha', 'alpha');
INSERT INTO fixed_codes (id, received_code, expected_code) VALUES (1, 'A', 'A');
INSERT INTO code_bands (id, code, first_code, last_code) VALUES (1, 'M', 'A', 'Z');
INSERT INTO default_labels (id, label, reference_label, fixed_label, fixed_reference) VALUES (1, 'alpha', 'alpha', 'A', 'A');

INSERT INTO unicode_labels (id, code_point, backup_code_point, printed_label, recorded_code_point, suppress_invalid)
VALUES (1, 233, 233, 'é', 233, false);

INSERT INTO label_character_sizes (id, suppress_invalid, label, padded_label, recorded_bit_length_text_1, recorded_char_length_padded_1, recorded_char_length_text_1, recorded_character_length_padded_1, recorded_character_length_text_1, recorded_length_padded_1, recorded_octet_length_padded_1, recorded_octet_length_text_1, recorded_textlen_text_1)
VALUES (1, false, 'é😊  ', 'é😊  ', 64, 2, 4, 2, 4, 2, 8, 8, 4);

INSERT INTO label_binary_order (id, suppress_invalid, label, other_label, padded_label, other_padded_label, recorded_bpchar_larger_padded_2, recorded_bpchar_larger_padded_2_octets, recorded_bpchar_pattern_ge_padded_2, recorded_bpchar_pattern_gt_padded_2, recorded_bpchar_pattern_le_padded_2, recorded_bpchar_pattern_lt_padded_2, recorded_bpchar_smaller_padded_2, recorded_bpchar_smaller_padded_2_octets, recorded_bpcharcmp_padded_2, recorded_btbpchar_pattern_cmp_padded_2, recorded_bttext_pattern_cmp_text_2, recorded_bttextcmp_text_2, recorded_text_larger_text_2, recorded_text_pattern_ge_text_2, recorded_text_pattern_gt_text_2, recorded_text_pattern_le_text_2, recorded_text_pattern_lt_text_2, recorded_text_smaller_text_2)
VALUES (1, false, 'é😊 ', 'αβ', 'é😊  ', 'αβ ', 'αβ ', 5, false, false, true, true, 'é😊  ', 8, -11, -11, -11, -11, 'αβ', false, false, true, true, 'é😊 ');

INSERT INTO cleaned_label_records (id, suppress_invalid, label, trim_characters, recorded_btrim_text_1, recorded_btrim_text_2, recorded_ltrim_text_1, recorded_ltrim_text_2, recorded_rtrim_text_1, recorded_rtrim_text_2)
VALUES (1, false, '  😊parcel😊  ', '😊 ', '😊parcel😊', 'parcel', '😊parcel😊  ', 'parcel😊  ', '  😊parcel😊', '  😊parcel');

INSERT INTO label_casing_records (id, suppress_invalid, label, recorded_casefold_text_1, recorded_initcap_text_1, recorded_lower_text_1, recorded_upper_text_1)
VALUES (1, false, 'élÈVE STRAẞE İß Σσς', 'élÈve straẞe İß Σσς', 'éLÈVe StraẞE İß Σσς', 'élÈve straẞe İß Σσς', 'éLÈVE STRAẞE İß Σσς');

INSERT INTO label_fingerprints (id, suppress_invalid, label, fixed_label, peer, seed, recorded_hash, recorded_fixed_hash, recorded_seeded_hash, recorded_fixed_seeded_hash, recorded_lexeme_order, recorded_jsonb_order)
VALUES ('1', false, 'alpha', 'alpha  ', 'z', '1', '956903556', '956903556', '5333970338675577285', '5333970338675577285', '-25', '-25');

INSERT INTO label_previews (id, suppress_invalid, label, starting, width, active, recorded_window, recorded_tail, recorded_prefix, recorded_suffix, recorded_reverse, recorded_active)
VALUES ('1', false, 'alphabet', '2', '3', true, 'lph', 'lphabet', 'alp', 'bet', 'tebahpla', 'true');

INSERT INTO label_builder_records (id,suppress_invalid,arg0_text,arg1_int4,arg2_text,arg1_text,recorded_lpad_2,recorded_lpad_2_octets,recorded_lpad_3,recorded_lpad_3_octets,recorded_repeat_2,recorded_repeat_2_octets,recorded_rpad_2,recorded_rpad_2_octets,recorded_rpad_3,recorded_rpad_3_octets,recorded_translate_3,recorded_translate_3_octets)
VALUES (100000,false,'abc'::pg_catalog.text,8,'😊'::pg_catalog.text,'ab'::pg_catalog.text,'     abc'::pg_catalog.text,8,'😊😊😊😊😊abc'::pg_catalog.text,23,'abcabcabcabcabcabcabcabc'::pg_catalog.text,24,'abc     '::pg_catalog.text,8,'abc😊😊😊😊😊'::pg_catalog.text,23,'😊c'::pg_catalog.text,5);

INSERT INTO label_edit_records (id,suppress_invalid,label,replacement,needle,delimiter,starting,removed,field_number,joined,joined_octets,needle_position,alternate_position,inserted,inserted_octets,overwritten,overwritten_octets,replaced,replaced_octets,selected_field,selected_field_octets)
VALUES (100000,false,'aababa','😊','ab','ab',2,2,2,'aababa😊',10,2,2,'a😊baba',9,'a😊aba',8,'a😊😊a',10,'',0);

INSERT INTO label_format_records (id,suppress_invalid,label,fixed_label,variable_label,type_modifier,is_explicit,adjusted_fixed,adjusted_fixed_octets,adjusted_variable,adjusted_variable_octets,fixed_preview,fixed_preview_octets,variable_preview,variable_preview_octets,unpadded_preview,unpadded_preview_octets,padded_preview,padded_preview_octets)
VALUES (100000,false,'abc','abc','abc',7,true,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3,'abc',3);

INSERT INTO label_literal_records (id,suppress_invalid,label,recorded_literal,recorded_octets)
VALUES (100000,false,'ordinary','''ordinary''',10);

INSERT INTO label_storage_records (id,suppress_invalid,size_label,recorded_bytes,maximum_bytes)
VALUES (100000,false,'1 kB',1024,9223372036854775807);

INSERT INTO label_pattern_records (id,suppress_invalid,label,fixed_label,pattern,escape_character,recorded_bpchariclike,recorded_bpcharicnlike,recorded_bpcharlike,recorded_bpcharnlike,recorded_like,recorded_notlike,recorded_texticlike,recorded_texticnlike,recorded_textlike,recorded_textnlike,recorded_escaped_match,recorded_escaped_folded_match,normalized_pattern,normalized_octets)
VALUES (100000,false,'alpha','alpha','a%','\',true,false,true,false,true,false,true,false,true,false,true,true,'a%',2);


INSERT INTO label_regex_records (id, suppress_invalid, label, fixed_label, pattern, flags, recorded_sensitive, recorded_insensitive, recorded_flagged) VALUES (1, false, 'abc', 'abc', 'a', '', true, true, true);

INSERT INTO label_count_records (id, suppress_invalid, label, pattern, starting, flags, recorded_count_2, recorded_count_3, recorded_count_4) VALUES (1, false, 'abc abc', 'a', 1, '', 2, 2, 2);
INSERT INTO label_position_records (id, suppress_invalid, label, pattern, starting, occurrence, end_option, flags, subexpression, recorded_position_2, recorded_position_3, recorded_position_4, recorded_position_5, recorded_position_6, recorded_position_7) VALUES (1, false, 'abc abc', 'a', 1, 1, 0, '', 0, 1, 1, 1, 1, 1, 1);
INSERT INTO label_extract_records (id, suppress_invalid, label, pattern, starting, occurrence, flags, subexpression, recorded_extract_2, recorded_extract_3, recorded_extract_4, recorded_extract_5, recorded_extract_6) VALUES (1, false, 'abc abc', 'a', 1, 1, '', 0, 'a', 'a', 'a', 'a', 'a');
INSERT INTO label_replacement_records (id, suppress_invalid, label, pattern, replacement, starting, occurrence, flags, recorded_regexp_replace_q5ba, recorded_regexp_replace_7z9g, recorded_regexp_replace_ohuj, recorded_regexp_replace_j9on, recorded_regexp_replace_3spp) VALUES (1, false, 'abc abc', 'a', 'X', 1, 1, '', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc', 'Xbc abc');

INSERT INTO label_pattern_conversions (id, suppress_invalid, pattern, escape, recorded_default, recorded_escaped)
VALUES (1, false, 'abc', '\', '^(?:abc)$', '^(?:abc)$');

INSERT INTO label_ascii_exports (id, label, encoding, ascii_label, ascii_octets)
VALUES (1, 'Export 123', 8, 'Export 123', 10);
INSERT INTO label_default_ascii_exports (id, label, ascii_label)
VALUES (1, NULL, NULL);

INSERT INTO label_unicode_escapes (id, escaped_label, printed_label, printed_octets)
VALUES (1, '\u0041', 'A', 1);

INSERT INTO xml_labels (id, document_label, content_label, suppress_invalid)
VALUES (1, '<root/>', 'plain<child/>tail', false);
