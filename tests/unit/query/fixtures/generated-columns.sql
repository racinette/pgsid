-- Generated columns read as their expressions over this row's columns:
-- doubled is a * 2 over NOT NULL a (notNull), label is b || '!' over
-- nullable b (nullable — sparse's b-NULL row witnesses it through the
-- strict concatenation), safe_label's COALESCE ends in a literal
-- (notNull). The catalog flag alone would have called all three nullable.
SELECT
  gm.doubled AS d,      -- @notNull
  gm.label AS l,        -- @nullable
  gm.safe_label AS s,   -- @notNull
  gm.b AS b             -- @nullable
FROM gm
