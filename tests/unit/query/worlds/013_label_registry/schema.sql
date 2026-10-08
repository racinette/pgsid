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
