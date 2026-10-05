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
