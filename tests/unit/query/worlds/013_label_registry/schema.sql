-- @world checks

CREATE TABLE label_pairs (
  id integer PRIMARY KEY,
  short_label varchar(8) COLLATE "C",
  reference_label varchar(12) COLLATE "C",
  CONSTRAINT label_match CHECK (short_label = reference_label),
  CONSTRAINT label_present CHECK (length(short_label) > 0)
);

CREATE TABLE fixed_codes (
  id integer PRIMARY KEY,
  received_code char(8) COLLATE "C",
  expected_code char(12) COLLATE "C",
  CONSTRAINT fixed_code_match CHECK (received_code = expected_code)
);

CREATE TABLE code_bands (
  id integer PRIMARY KEY,
  code char(8) COLLATE "C",
  first_code char(4) COLLATE "C",
  last_code char(12) COLLATE "C",
  CONSTRAINT code_in_band CHECK (code BETWEEN first_code AND last_code)
);

CREATE TABLE default_labels (
  id integer PRIMARY KEY,
  label varchar(8),
  reference_label varchar(12),
  fixed_label char(8),
  fixed_reference char(12),
  CONSTRAINT default_label_match CHECK (label = reference_label),
  CONSTRAINT default_fixed_match CHECK (fixed_label = fixed_reference)
);


CREATE TABLE unicode_labels (
  id integer PRIMARY KEY,
  code_point integer,
  backup_code_point integer,
  printed_label text,
  recorded_code_point integer,
  suppress_invalid boolean NOT NULL,
  CONSTRAINT label_from_code_point CHECK (
    CASE WHEN suppress_invalid THEN true ELSE chr(code_point) = printed_label END
  ),
  CONSTRAINT label_recorded_code_point CHECK (
    CASE WHEN suppress_invalid THEN true ELSE ascii(chr(code_point)) = recorded_code_point END
  ),
  CONSTRAINT label_default_code_point CHECK (
    CASE WHEN suppress_invalid THEN true ELSE chr(COALESCE(code_point, backup_code_point)) = printed_label END
  )
);

CREATE TABLE label_character_sizes (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text,
  padded_label pg_catalog.bpchar,
  recorded_bit_length_text_1 integer,
  recorded_char_length_padded_1 integer,
  recorded_char_length_text_1 integer,
  recorded_character_length_padded_1 integer,
  recorded_character_length_text_1 integer,
  recorded_length_padded_1 integer,
  recorded_octet_length_padded_1 integer,
  recorded_octet_length_text_1 integer,
  recorded_textlen_text_1 integer,
  CONSTRAINT bit_length_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bit_length(label) = recorded_bit_length_text_1 END),
  CONSTRAINT char_length_padded_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.char_length(padded_label) = recorded_char_length_padded_1 END),
  CONSTRAINT char_length_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.char_length(label) = recorded_char_length_text_1 END),
  CONSTRAINT character_length_padded_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.character_length(padded_label) = recorded_character_length_padded_1 END),
  CONSTRAINT character_length_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.character_length(label) = recorded_character_length_text_1 END),
  CONSTRAINT length_padded_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.length(padded_label) = recorded_length_padded_1 END),
  CONSTRAINT octet_length_padded_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.octet_length(padded_label) = recorded_octet_length_padded_1 END),
  CONSTRAINT octet_length_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.octet_length(label) = recorded_octet_length_text_1 END),
  CONSTRAINT textlen_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.textlen(label) = recorded_textlen_text_1 END)
);

CREATE TABLE label_binary_order (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  other_label text COLLATE "C",
  padded_label pg_catalog.bpchar COLLATE "C",
  other_padded_label pg_catalog.bpchar COLLATE "C",
  recorded_bpchar_larger_padded_2 pg_catalog.bpchar COLLATE "C",
  recorded_bpchar_larger_padded_2_octets integer,
  recorded_bpchar_pattern_ge_padded_2 boolean,
  recorded_bpchar_pattern_gt_padded_2 boolean,
  recorded_bpchar_pattern_le_padded_2 boolean,
  recorded_bpchar_pattern_lt_padded_2 boolean,
  recorded_bpchar_smaller_padded_2 pg_catalog.bpchar COLLATE "C",
  recorded_bpchar_smaller_padded_2_octets integer,
  recorded_bpcharcmp_padded_2 integer,
  recorded_btbpchar_pattern_cmp_padded_2 integer,
  recorded_bttext_pattern_cmp_text_2 integer,
  recorded_bttextcmp_text_2 integer,
  recorded_text_larger_text_2 text COLLATE "C",
  recorded_text_pattern_ge_text_2 boolean,
  recorded_text_pattern_gt_text_2 boolean,
  recorded_text_pattern_le_text_2 boolean,
  recorded_text_pattern_lt_text_2 boolean,
  recorded_text_smaller_text_2 text COLLATE "C",
  CONSTRAINT bpchar_larger_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchar_larger(padded_label, other_padded_label) = recorded_bpchar_larger_padded_2 END),
  CONSTRAINT bpchar_larger_padded_2_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.octet_length(pg_catalog.bpchar_larger(padded_label, other_padded_label)) = recorded_bpchar_larger_padded_2_octets END),
  CONSTRAINT bpchar_pattern_ge_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchar_pattern_ge(padded_label, other_padded_label) = recorded_bpchar_pattern_ge_padded_2 END),
  CONSTRAINT bpchar_pattern_gt_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchar_pattern_gt(padded_label, other_padded_label) = recorded_bpchar_pattern_gt_padded_2 END),
  CONSTRAINT bpchar_pattern_le_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchar_pattern_le(padded_label, other_padded_label) = recorded_bpchar_pattern_le_padded_2 END),
  CONSTRAINT bpchar_pattern_lt_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchar_pattern_lt(padded_label, other_padded_label) = recorded_bpchar_pattern_lt_padded_2 END),
  CONSTRAINT bpchar_smaller_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchar_smaller(padded_label, other_padded_label) = recorded_bpchar_smaller_padded_2 END),
  CONSTRAINT bpchar_smaller_padded_2_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.octet_length(pg_catalog.bpchar_smaller(padded_label, other_padded_label)) = recorded_bpchar_smaller_padded_2_octets END),
  CONSTRAINT bpcharcmp_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharcmp(padded_label, other_padded_label) = recorded_bpcharcmp_padded_2 END),
  CONSTRAINT btbpchar_pattern_cmp_padded_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.btbpchar_pattern_cmp(padded_label, other_padded_label) = recorded_btbpchar_pattern_cmp_padded_2 END),
  CONSTRAINT bttext_pattern_cmp_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bttext_pattern_cmp(label, other_label) = recorded_bttext_pattern_cmp_text_2 END),
  CONSTRAINT bttextcmp_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bttextcmp(label, other_label) = recorded_bttextcmp_text_2 END),
  CONSTRAINT text_larger_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.text_larger(label, other_label) = recorded_text_larger_text_2 END),
  CONSTRAINT text_pattern_ge_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.text_pattern_ge(label, other_label) = recorded_text_pattern_ge_text_2 END),
  CONSTRAINT text_pattern_gt_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.text_pattern_gt(label, other_label) = recorded_text_pattern_gt_text_2 END),
  CONSTRAINT text_pattern_le_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.text_pattern_le(label, other_label) = recorded_text_pattern_le_text_2 END),
  CONSTRAINT text_pattern_lt_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.text_pattern_lt(label, other_label) = recorded_text_pattern_lt_text_2 END),
  CONSTRAINT text_smaller_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.text_smaller(label, other_label) = recorded_text_smaller_text_2 END)
);

CREATE TABLE cleaned_label_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text,
  trim_characters text,
  recorded_btrim_text_1 text,
  recorded_btrim_text_2 text,
  recorded_ltrim_text_1 text,
  recorded_ltrim_text_2 text,
  recorded_rtrim_text_1 text,
  recorded_rtrim_text_2 text,
  CONSTRAINT btrim_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.btrim(label) = recorded_btrim_text_1 END),
  CONSTRAINT btrim_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.btrim(label, trim_characters) = recorded_btrim_text_2 END),
  CONSTRAINT ltrim_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.ltrim(label) = recorded_ltrim_text_1 END),
  CONSTRAINT ltrim_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.ltrim(label, trim_characters) = recorded_ltrim_text_2 END),
  CONSTRAINT rtrim_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.rtrim(label) = recorded_rtrim_text_1 END),
  CONSTRAINT rtrim_text_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.rtrim(label, trim_characters) = recorded_rtrim_text_2 END)
);

CREATE TABLE label_casing_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  recorded_casefold_text_1 text COLLATE "C",
  recorded_initcap_text_1 text COLLATE "C",
  recorded_lower_text_1 text COLLATE "C",
  recorded_upper_text_1 text COLLATE "C",
  CONSTRAINT casefold_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.casefold(label) = recorded_casefold_text_1 END),
  CONSTRAINT initcap_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.initcap(label) = recorded_initcap_text_1 END),
  CONSTRAINT lower_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.lower(label) = recorded_lower_text_1 END),
  CONSTRAINT upper_text_1 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.upper(label) = recorded_upper_text_1 END)
);

CREATE TABLE label_fingerprints (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  fixed_label bpchar COLLATE "C",
  peer text COLLATE "C",
  seed bigint,
  recorded_hash integer,
  recorded_fixed_hash integer,
  recorded_seeded_hash bigint,
  recorded_fixed_seeded_hash bigint,
  recorded_lexeme_order integer,
  recorded_jsonb_order integer,
  CONSTRAINT label_hash CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.hashtext(label) = recorded_hash END),
  CONSTRAINT label_fixed_hash CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.hashbpchar(fixed_label) = recorded_fixed_hash END),
  CONSTRAINT label_seeded_hash CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.hashtextextended(label, seed) = recorded_seeded_hash END),
  CONSTRAINT label_fixed_seeded_hash CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.hashbpcharextended(fixed_label, seed) = recorded_fixed_seeded_hash END),
  CONSTRAINT label_lexeme_order CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.gin_cmp_tslexeme(label, peer) = recorded_lexeme_order END),
  CONSTRAINT label_jsonb_order CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.gin_compare_jsonb(label, peer) = recorded_jsonb_order END)
);

CREATE TABLE label_previews (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  starting integer,
  width integer,
  active boolean,
  recorded_window text COLLATE "C",
  recorded_tail text COLLATE "C",
  recorded_prefix text COLLATE "C",
  recorded_suffix text COLLATE "C",
  recorded_reverse text COLLATE "C",
  recorded_active text COLLATE "C",
  CONSTRAINT label_substring_window CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.substring(label,starting,width) = recorded_window END),
  CONSTRAINT label_substr_window CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.substr(label,starting,width) = recorded_window END),
  CONSTRAINT label_substring_tail CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.substring(label,starting) = recorded_tail END),
  CONSTRAINT label_substr_tail CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.substr(label,starting) = recorded_tail END),
  CONSTRAINT label_left_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.left(label,width) = recorded_prefix END),
  CONSTRAINT label_right_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.right(label,width) = recorded_suffix END),
  CONSTRAINT label_reverse_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.reverse(label) = recorded_reverse END),
  CONSTRAINT label_active_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE active::text = recorded_active END)
);

CREATE TABLE label_builder_records (
 id integer PRIMARY KEY,
 suppress_invalid boolean NOT NULL DEFAULT false,
 arg0_text pg_catalog.text,
 arg1_int4 pg_catalog.int4,
 arg2_text pg_catalog.text,
 arg1_text pg_catalog.text,
 recorded_lpad_2 pg_catalog.text,
 recorded_lpad_2_octets pg_catalog.int4,
 recorded_lpad_3 pg_catalog.text,
 recorded_lpad_3_octets pg_catalog.int4,
 recorded_repeat_2 pg_catalog.text,
 recorded_repeat_2_octets pg_catalog.int4,
 recorded_rpad_2 pg_catalog.text,
 recorded_rpad_2_octets pg_catalog.int4,
 recorded_rpad_3 pg_catalog.text,
 recorded_rpad_3_octets pg_catalog.int4,
 recorded_translate_3 pg_catalog.text,
 recorded_translate_3_octets pg_catalog.int4,
 CONSTRAINT lpad_2_value CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.lpad(arg0_text,arg1_int4) = recorded_lpad_2 END),
 CONSTRAINT lpad_2_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.lpad(arg0_text,arg1_int4)) = recorded_lpad_2_octets END),
 CONSTRAINT lpad_3_value CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.lpad(arg0_text,arg1_int4,arg2_text) = recorded_lpad_3 END),
 CONSTRAINT lpad_3_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.lpad(arg0_text,arg1_int4,arg2_text)) = recorded_lpad_3_octets END),
 CONSTRAINT repeat_2_value CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.repeat(arg0_text,arg1_int4) = recorded_repeat_2 END),
 CONSTRAINT repeat_2_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.repeat(arg0_text,arg1_int4)) = recorded_repeat_2_octets END),
 CONSTRAINT rpad_2_value CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.rpad(arg0_text,arg1_int4) = recorded_rpad_2 END),
 CONSTRAINT rpad_2_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.rpad(arg0_text,arg1_int4)) = recorded_rpad_2_octets END),
 CONSTRAINT rpad_3_value CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.rpad(arg0_text,arg1_int4,arg2_text) = recorded_rpad_3 END),
 CONSTRAINT rpad_3_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.rpad(arg0_text,arg1_int4,arg2_text)) = recorded_rpad_3_octets END),
 CONSTRAINT translate_3_value CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.translate(arg0_text,arg1_text,arg2_text) = recorded_translate_3 END),
 CONSTRAINT translate_3_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.translate(arg0_text,arg1_text,arg2_text)) = recorded_translate_3_octets END)
);

CREATE TABLE label_edit_records (
 id integer PRIMARY KEY,
 suppress_invalid boolean NOT NULL DEFAULT false,
 label text,
 replacement text,
 needle text,
 delimiter text,
 starting int4,
 removed int4,
 field_number int4,
 joined text,
 joined_octets int4,
 needle_position int4,
 alternate_position int4,
 inserted text,
 inserted_octets int4,
 overwritten text,
 overwritten_octets int4,
 replaced text,
 replaced_octets int4,
 selected_field text,
 selected_field_octets int4,
 CONSTRAINT label_joined CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.textcat(label,replacement) = joined END),
 CONSTRAINT label_joined_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.textcat(label,replacement)) = joined_octets END),
 CONSTRAINT label_needle_position CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.strpos(label,needle) = needle_position END),
 CONSTRAINT label_alternate_position CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.position(label,needle) = alternate_position END),
 CONSTRAINT label_inserted CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.overlay(label,replacement,starting) = inserted END),
 CONSTRAINT label_inserted_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.overlay(label,replacement,starting)) = inserted_octets END),
 CONSTRAINT label_overwritten CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.overlay(label,replacement,starting,removed) = overwritten END),
 CONSTRAINT label_overwritten_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.overlay(label,replacement,starting,removed)) = overwritten_octets END),
 CONSTRAINT label_replaced CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.replace(label,needle,replacement) = replaced END),
 CONSTRAINT label_replaced_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.replace(label,needle,replacement)) = replaced_octets END),
 CONSTRAINT label_selected_field CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.split_part(label,delimiter,field_number) = selected_field END),
 CONSTRAINT label_selected_field_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.split_part(label,delimiter,field_number)) = selected_field_octets END),
 CONSTRAINT label_join_operator CHECK (CASE WHEN suppress_invalid THEN true ELSE label || replacement = joined END)
);

CREATE TABLE label_format_records (
 id integer PRIMARY KEY,
 suppress_invalid boolean NOT NULL DEFAULT false,
 label text,
 fixed_label bpchar,
 variable_label varchar,
 type_modifier int4,
 is_explicit bool,
 adjusted_fixed text,
 adjusted_fixed_octets int4,
 adjusted_variable text,
 adjusted_variable_octets int4,
 fixed_preview text,
 fixed_preview_octets int4,
 variable_preview text,
 variable_preview_octets int4,
 unpadded_preview text,
 unpadded_preview_octets int4,
 padded_preview text,
 padded_preview_octets int4,
 CONSTRAINT label_adjusted_fixed CHECK (CASE WHEN suppress_invalid THEN true ELSE (pg_catalog.bpchar(fixed_label,type_modifier,is_explicit))::text = adjusted_fixed END),
 CONSTRAINT label_adjusted_fixed_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.bpchar(fixed_label,type_modifier,is_explicit)) = adjusted_fixed_octets END),
 CONSTRAINT label_adjusted_variable CHECK (CASE WHEN suppress_invalid THEN true ELSE (pg_catalog."varchar"(variable_label,type_modifier,is_explicit))::text = adjusted_variable END),
 CONSTRAINT label_adjusted_variable_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog."varchar"(variable_label,type_modifier,is_explicit)) = adjusted_variable_octets END),
 CONSTRAINT label_fixed_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE (label::character(3))::text = fixed_preview END),
 CONSTRAINT label_fixed_preview_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(label::character(3)) = fixed_preview_octets END),
 CONSTRAINT label_variable_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE (label::varchar(3))::text = variable_preview END),
 CONSTRAINT label_variable_preview_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(label::varchar(3)) = variable_preview_octets END),
 CONSTRAINT label_unpadded_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE (fixed_label::varchar(3))::text = unpadded_preview END),
 CONSTRAINT label_unpadded_preview_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(fixed_label::varchar(3)) = unpadded_preview_octets END),
 CONSTRAINT label_padded_preview CHECK (CASE WHEN suppress_invalid THEN true ELSE (variable_label::character(3))::text = padded_preview END),
 CONSTRAINT label_padded_preview_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(variable_label::character(3)) = padded_preview_octets END)
);

CREATE TABLE label_literal_records (
 id integer PRIMARY KEY,
 suppress_invalid boolean NOT NULL DEFAULT false,
 label text,
 recorded_literal text,
 recorded_octets integer,
 CONSTRAINT label_quoted_literal CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.quote_literal(label)=recorded_literal END),
 CONSTRAINT label_quoted_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.quote_literal(label))=recorded_octets END)
);

CREATE TABLE label_storage_records (
 id integer PRIMARY KEY,
 suppress_invalid boolean NOT NULL DEFAULT false,
 size_label text,
 recorded_bytes bigint,
 maximum_bytes bigint,
 CONSTRAINT label_size_bytes CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.pg_size_bytes(size_label) = recorded_bytes END),
 CONSTRAINT label_size_limit CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.pg_size_bytes(size_label) <= maximum_bytes END)
);

CREATE TABLE label_pattern_records (
 id integer PRIMARY KEY,
 suppress_invalid boolean NOT NULL DEFAULT false,
 label text COLLATE "C",
 fixed_label bpchar COLLATE "C",
 pattern text COLLATE "C",
 escape_character text,
 recorded_bpchariclike boolean,
 recorded_bpcharicnlike boolean,
 recorded_bpcharlike boolean,
 recorded_bpcharnlike boolean,
 recorded_like boolean,
 recorded_notlike boolean,
 recorded_texticlike boolean,
 recorded_texticnlike boolean,
 recorded_textlike boolean,
 recorded_textnlike boolean,
 recorded_escaped_match boolean,
 recorded_escaped_folded_match boolean,
 normalized_pattern text COLLATE "C",
 normalized_octets int4,
 CONSTRAINT label_bpchariclike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpchariclike(fixed_label,pattern)=recorded_bpchariclike END),
 CONSTRAINT label_bpcharicnlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharicnlike(fixed_label,pattern)=recorded_bpcharicnlike END),
 CONSTRAINT label_bpcharlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharlike(fixed_label,pattern)=recorded_bpcharlike END),
 CONSTRAINT label_bpcharnlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharnlike(fixed_label,pattern)=recorded_bpcharnlike END),
 CONSTRAINT label_like CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.like(label,pattern)=recorded_like END),
 CONSTRAINT label_notlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.notlike(label,pattern)=recorded_notlike END),
 CONSTRAINT label_texticlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.texticlike(label,pattern)=recorded_texticlike END),
 CONSTRAINT label_texticnlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.texticnlike(label,pattern)=recorded_texticnlike END),
 CONSTRAINT label_textlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.textlike(label,pattern)=recorded_textlike END),
 CONSTRAINT label_textnlike CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.textnlike(label,pattern)=recorded_textnlike END),
 CONSTRAINT label_escaped_match CHECK (CASE WHEN suppress_invalid THEN true ELSE (label LIKE pattern ESCAPE escape_character)=recorded_escaped_match END),
 CONSTRAINT label_escaped_folded_match CHECK (CASE WHEN suppress_invalid THEN true ELSE (label ILIKE pattern ESCAPE escape_character)=recorded_escaped_folded_match END),
 CONSTRAINT label_normalized_pattern CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.like_escape(pattern,escape_character)=normalized_pattern END),
 CONSTRAINT label_normalized_octets CHECK (CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.like_escape(pattern,escape_character))=normalized_octets END)
);


CREATE TABLE label_regex_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  fixed_label pg_catalog.bpchar COLLATE "C",
  pattern text COLLATE "C",
  flags text COLLATE "C",
  recorded_sensitive boolean,
  recorded_insensitive boolean,
  recorded_flagged boolean,
  CONSTRAINT recorded_regex CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_like(label, pattern) = recorded_sensitive END),
  CONSTRAINT recorded_regex_flags CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_like(label, pattern, flags) = recorded_flagged END),
  CONSTRAINT recorded_text_regexeq CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.textregexeq(label, pattern) = (recorded_sensitive) END),
  CONSTRAINT recorded_text_regexne CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.textregexne(label, pattern) = (NOT recorded_sensitive) END),
  CONSTRAINT recorded_text_icregexeq CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.texticregexeq(label, pattern) = (recorded_insensitive) END),
  CONSTRAINT recorded_text_icregexne CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.texticregexne(label, pattern) = (NOT recorded_insensitive) END),
  CONSTRAINT recorded_text_operator_match CHECK (CASE WHEN suppress_invalid THEN true ELSE (label ~ pattern) = (recorded_sensitive) END),
  CONSTRAINT recorded_text_operator_not_match CHECK (CASE WHEN suppress_invalid THEN true ELSE (label !~ pattern) = (NOT recorded_sensitive) END),
  CONSTRAINT recorded_text_operator_folded CHECK (CASE WHEN suppress_invalid THEN true ELSE (label ~* pattern) = (recorded_insensitive) END),
  CONSTRAINT recorded_text_operator_not_folded CHECK (CASE WHEN suppress_invalid THEN true ELSE (label !~* pattern) = (NOT recorded_insensitive) END),
  CONSTRAINT recorded_bpchar_regexeq CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharregexeq(fixed_label, pattern) = (recorded_sensitive) END),
  CONSTRAINT recorded_bpchar_regexne CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharregexne(fixed_label, pattern) = (NOT recorded_sensitive) END),
  CONSTRAINT recorded_bpchar_icregexeq CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharicregexeq(fixed_label, pattern) = (recorded_insensitive) END),
  CONSTRAINT recorded_bpchar_icregexne CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.bpcharicregexne(fixed_label, pattern) = (NOT recorded_insensitive) END),
  CONSTRAINT recorded_bpchar_operator_match CHECK (CASE WHEN suppress_invalid THEN true ELSE (fixed_label ~ pattern) = (recorded_sensitive) END),
  CONSTRAINT recorded_bpchar_operator_not_match CHECK (CASE WHEN suppress_invalid THEN true ELSE (fixed_label !~ pattern) = (NOT recorded_sensitive) END),
  CONSTRAINT recorded_bpchar_operator_folded CHECK (CASE WHEN suppress_invalid THEN true ELSE (fixed_label ~* pattern) = (recorded_insensitive) END),
  CONSTRAINT recorded_bpchar_operator_not_folded CHECK (CASE WHEN suppress_invalid THEN true ELSE (fixed_label !~* pattern) = (NOT recorded_insensitive) END),
  CONSTRAINT recorded_nested_regex CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_like(label || '', reverse(reverse(pattern)), flags) = recorded_flagged END)
);

CREATE TABLE label_count_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  pattern text COLLATE "C",
  starting integer,
  flags text COLLATE "C",
  recorded_count_2 integer,
  recorded_count_3 integer,
  recorded_count_4 integer,
  CONSTRAINT label_count_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_count(label, pattern) = recorded_count_2 END),
  CONSTRAINT label_count_3 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_count(label, pattern, starting) = recorded_count_3 END),
  CONSTRAINT label_count_4 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_count(label, pattern, starting, flags) = recorded_count_4 END)
);

CREATE TABLE label_position_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  pattern text COLLATE "C",
  starting integer,
  occurrence integer,
  end_option integer,
  flags text COLLATE "C",
  subexpression integer,
  recorded_position_2 integer,
  recorded_position_3 integer,
  recorded_position_4 integer,
  recorded_position_5 integer,
  recorded_position_6 integer,
  recorded_position_7 integer,
  CONSTRAINT label_position_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_instr(label, pattern) = recorded_position_2 END),
  CONSTRAINT label_position_3 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_instr(label, pattern, starting) = recorded_position_3 END),
  CONSTRAINT label_position_4 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_instr(label, pattern, starting, occurrence) = recorded_position_4 END),
  CONSTRAINT label_position_5 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_instr(label, pattern, starting, occurrence, end_option) = recorded_position_5 END),
  CONSTRAINT label_position_6 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_instr(label, pattern, starting, occurrence, end_option, flags) = recorded_position_6 END),
  CONSTRAINT label_position_7 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_instr(label, pattern, starting, occurrence, end_option, flags, subexpression) = recorded_position_7 END)
);

CREATE TABLE label_extract_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  pattern text COLLATE "C",
  starting integer,
  occurrence integer,
  flags text COLLATE "C",
  subexpression integer,
  recorded_extract_2 text COLLATE "C",
  recorded_extract_3 text COLLATE "C",
  recorded_extract_4 text COLLATE "C",
  recorded_extract_5 text COLLATE "C",
  recorded_extract_6 text COLLATE "C",
  CONSTRAINT label_extract_2 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_substr(label, pattern) = recorded_extract_2 END),
  CONSTRAINT label_extract_3 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_substr(label, pattern, starting) = recorded_extract_3 END),
  CONSTRAINT label_extract_4 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_substr(label, pattern, starting, occurrence) = recorded_extract_4 END),
  CONSTRAINT label_extract_5 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_substr(label, pattern, starting, occurrence, flags) = recorded_extract_5 END),
  CONSTRAINT label_extract_6 CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_substr(label, pattern, starting, occurrence, flags, subexpression) = recorded_extract_6 END)
);

CREATE TABLE label_replacement_records (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  label text COLLATE "C",
  pattern text COLLATE "C",
  replacement text COLLATE "C",
  starting integer,
  occurrence integer,
  flags text COLLATE "C",
  recorded_regexp_replace_q5ba text COLLATE "C",
  recorded_regexp_replace_7z9g text COLLATE "C",
  recorded_regexp_replace_ohuj text COLLATE "C",
  recorded_regexp_replace_j9on text COLLATE "C",
  recorded_regexp_replace_3spp text COLLATE "C",
  CONSTRAINT label_regexp_replace_q5ba CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_replace(label, pattern, replacement) = recorded_regexp_replace_q5ba END),
  CONSTRAINT label_regexp_replace_7z9g CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_replace(label, pattern, replacement, starting) = recorded_regexp_replace_7z9g END),
  CONSTRAINT label_regexp_replace_ohuj CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_replace(label, pattern, replacement, starting, occurrence) = recorded_regexp_replace_ohuj END),
  CONSTRAINT label_regexp_replace_j9on CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_replace(label, pattern, replacement, starting, occurrence, flags) = recorded_regexp_replace_j9on END),
  CONSTRAINT label_regexp_replace_3spp CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.regexp_replace(label, pattern, replacement, flags) = recorded_regexp_replace_3spp END)
);

CREATE TABLE label_pattern_conversions (
  id integer PRIMARY KEY,
  suppress_invalid boolean NOT NULL DEFAULT false,
  pattern text,
  escape text,
  recorded_default text COLLATE "C",
  recorded_escaped text COLLATE "C",
  CONSTRAINT label_default_pattern CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.similar_to_escape(pattern) COLLATE "C" = recorded_default END),
  CONSTRAINT label_escaped_pattern CHECK (CASE WHEN suppress_invalid THEN true ELSE pg_catalog.similar_to_escape(pattern, escape) COLLATE "C" = recorded_escaped END)
);

CREATE TABLE label_ascii_exports (
  id integer PRIMARY KEY,
  label text,
  encoding integer,
  ascii_label text COLLATE "C",
  ascii_octets integer,
  suppress_invalid boolean NOT NULL DEFAULT false,
  CONSTRAINT exported_ascii_label CHECK (
    CASE WHEN suppress_invalid THEN true ELSE pg_catalog.to_ascii(label, encoding) COLLATE "C" = ascii_label END
  ),
  CONSTRAINT exported_ascii_octets CHECK (
    CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.to_ascii(label, encoding)) = ascii_octets END
  )
);

CREATE TABLE label_default_ascii_exports (
  id integer PRIMARY KEY,
  label text,
  ascii_label text COLLATE "C",
  suppress_invalid boolean NOT NULL DEFAULT false,
  CONSTRAINT exported_default_ascii CHECK (
    CASE WHEN suppress_invalid THEN true ELSE pg_catalog.to_ascii(label) COLLATE "C" = ascii_label END
  )
);

CREATE TABLE label_unicode_escapes (
  id integer PRIMARY KEY,
  escaped_label text,
  printed_label text COLLATE "C",
  printed_octets integer,
  suppress_invalid boolean NOT NULL DEFAULT false,
  CONSTRAINT unicode_escape_label CHECK (
    CASE WHEN suppress_invalid THEN true ELSE pg_catalog.unistr(escaped_label) COLLATE "C" = printed_label END
  ),
  CONSTRAINT unicode_escape_octets CHECK (
    CASE WHEN suppress_invalid THEN true ELSE octet_length(pg_catalog.unistr(escaped_label)) = printed_octets END
  )
);
