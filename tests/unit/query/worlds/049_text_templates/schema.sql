-- @world checks
CREATE TABLE parsed_amounts (
  amount_text text,
  template text,
  expected numeric,
  bypass boolean NOT NULL,
  CONSTRAINT amount_parses CHECK (CASE WHEN bypass THEN true ELSE to_number(amount_text, template) = expected END)
);

CREATE TABLE prefixed_codes (
  code text,
  prefix text,
  bypass boolean NOT NULL,
  CONSTRAINT code_has_prefix CHECK (CASE WHEN bypass THEN true ELSE starts_with(code, prefix) END),
  CONSTRAINT code_is_regional CHECK (CASE WHEN bypass THEN true ELSE code ^@ 'EU' OR code ^@ 'US' END)
);

CREATE TABLE extracted_parts (
  label text COLLATE "C",
  pattern text COLLATE "C",
  escape_character text COLLATE "C",
  expected_part text COLLATE "C",
  expect_untyped_null boolean,
  bypass boolean NOT NULL,
  CONSTRAINT part_extracts CHECK (CASE WHEN bypass THEN true ELSE substring(label, pattern, escape_character) = expected_part END),
  CONSTRAINT untyped_collation CHECK (CASE WHEN bypass THEN true ELSE (pg_collation_for('label') IS NULL) = expect_untyped_null END)
);
