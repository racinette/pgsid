-- @world checks
CREATE TABLE overload_choices (
  small smallint,
  medium integer,
  large bigint,
  exact numeric,
  approx double precision,
  label text,
  fixed char(4),
  ident name,
  flag "char",
  bypass boolean NOT NULL,
  CONSTRAINT mixed_arithmetic CHECK (CASE WHEN bypass THEN true ELSE small + medium + large < 100 END),
  CONSTRAINT exact_with_float CHECK (CASE WHEN bypass THEN true ELSE exact + approx > 0 END),
  CONSTRAINT rounded CHECK (CASE WHEN bypass THEN true ELSE round(exact, 1) = round(approx::numeric, 1) END),
  CONSTRAINT case_common CHECK (CASE WHEN bypass THEN true ELSE (CASE WHEN small > 0 THEN small ELSE exact END) > 0 END),
  CONSTRAINT coalesced CHECK (CASE WHEN bypass THEN true ELSE COALESCE(small, large) < 50 END),
  CONSTRAINT greatest_mixed CHECK (CASE WHEN bypass THEN true ELSE GREATEST(medium, exact, 0) < 100 END),
  CONSTRAINT concatenated CHECK (CASE WHEN bypass THEN true ELSE label || small = 'n1' OR label || small IS NULL END),
  CONSTRAINT fixed_compare CHECK (CASE WHEN bypass THEN true ELSE fixed = 'ab' END),
  CONSTRAINT fixed_text CHECK (CASE WHEN bypass THEN true ELSE fixed::text || '|' = 'ab|' END),
  CONSTRAINT name_compare CHECK (CASE WHEN bypass THEN true ELSE ident = label END),
  CONSTRAINT internal_char CHECK (CASE WHEN bypass THEN true ELSE flag = 'a' END),
  CONSTRAINT abs_small CHECK (CASE WHEN bypass THEN true ELSE abs(small) <= 32767 END),
  CONSTRAINT division CHECK (CASE WHEN bypass THEN true ELSE medium / small >= 0 END),
  CONSTRAINT modulo_large CHECK (CASE WHEN bypass THEN true ELSE large % medium = 0 END)
);

CREATE TABLE nonstrict_calls (
  a text,
  b text,
  n integer,
  d integer,
  bypass boolean NOT NULL,
  CONSTRAINT concat_parts CHECK (CASE WHEN bypass THEN true ELSE concat(a, n, b) <> '' END),
  CONSTRAINT concat_separated CHECK (CASE WHEN bypass THEN true ELSE concat_ws('-', a, n / d, b) <> 'x' END),
  CONSTRAINT format_parts CHECK (CASE WHEN bypass THEN true ELSE format('%s:%s', a, n) <> '' END),
  CONSTRAINT format_width CHECK (CASE WHEN bypass THEN true ELSE length(format('%*s', n, a)) >= 0 END),
  CONSTRAINT null_counts CHECK (CASE WHEN bypass THEN true ELSE num_nulls(a, b, n / d) <= 2 END),
  CONSTRAINT nonnull_counts CHECK (CASE WHEN bypass THEN true ELSE num_nonnulls(a, b) >= 1 END),
  CONSTRAINT quoted CHECK (CASE WHEN bypass THEN true ELSE quote_nullable(a) <> 'NULL' END),
  CONSTRAINT coalesce_lazy CHECK (CASE WHEN bypass THEN true ELSE COALESCE(n, n / d) > 0 END),
  CONSTRAINT nullif_text CHECK (CASE WHEN bypass THEN true ELSE NULLIF(a, b) IS NOT NULL END)
);

CREATE TABLE concatenations (
  label text,
  small smallint,
  addr inet,
  day date,
  flag boolean,
  amount numeric,
  expected text COLLATE "C",
  bypass boolean NOT NULL,
  CONSTRAINT concat_values CHECK (CASE WHEN bypass THEN true ELSE (label || small || '|' || addr || '|' || day || '|' || flag || '|' || amount) COLLATE "C" = expected END),
  CONSTRAINT concat_leading CHECK (CASE WHEN bypass THEN true ELSE small || label <> 'x' END)
);
