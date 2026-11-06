-- @world checks
CREATE TYPE bit_fields AS (fixed bit(3)[], varying varbit(2)[]);
CREATE DOMAIN fixed_bits AS bit(3)[];
CREATE DOMAIN short_bits AS varbit(2)[] CHECK (cardinality(VALUE) > 0);

CREATE TABLE bit_modifiers (
  source text,
  bypass boolean NOT NULL,
  CONSTRAINT record_fields CHECK (CASE WHEN bypass THEN true ELSE (source::bit_fields) IS NOT NULL END),
  CONSTRAINT record_field_value CHECK (CASE WHEN bypass THEN true ELSE ((source::bit_fields).fixed)[1] = B'101' END)
);

CREATE TABLE bit_domains (
  fixed_source text,
  short_source text,
  bypass boolean NOT NULL,
  CONSTRAINT fixed_domain CHECK (CASE WHEN bypass THEN true ELSE cardinality(fixed_source::fixed_bits) = 1 END),
  CONSTRAINT short_domain CHECK (CASE WHEN bypass THEN true ELSE cardinality(short_source::short_bits) >= 1 END)
);

CREATE TABLE array_bounds (
  source text,
  values_column int[],
  bypass boolean NOT NULL,
  CONSTRAINT text_lower CHECK (CASE WHEN bypass THEN true ELSE array_lower(source::int[], 1) = 2 END),
  CONSTRAINT text_rendered CHECK (CASE WHEN bypass THEN true ELSE (source::int[])::text = '[2:3]={1,2}' END),
  CONSTRAINT stored_constant CHECK (CASE WHEN bypass THEN true ELSE values_column = '[0:1]={1,2}'::int[] END),
  CONSTRAINT stored_lower CHECK (CASE WHEN bypass THEN true ELSE array_lower(values_column, 1) = array_lower('[0:1]={1,2}'::int[], 1) END)
);

CREATE TABLE context_nullness (
  reading double precision,
  readings double precision[],
  bypass boolean NOT NULL,
  CONSTRAINT text_nullness CHECK (CASE WHEN bypass THEN true ELSE (reading::text) IS NOT NULL END),
  CONSTRAINT joined_nullness CHECK (CASE WHEN bypass THEN true ELSE array_to_string(readings, ',') IS NOT NULL END),
  CONSTRAINT array_text_nullness CHECK (CASE WHEN bypass THEN true ELSE (readings::text) IS NOT NULL END),
  CONSTRAINT split_cardinality CHECK (CASE WHEN bypass THEN true ELSE cardinality(string_to_array(readings::text, ',')) = cardinality(readings) END)
);
