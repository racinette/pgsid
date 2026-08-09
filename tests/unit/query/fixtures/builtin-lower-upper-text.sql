-- The charter's founding recovery (docs/type-aware-overloads.md): `lower`
-- and `upper` left STRICT_TOTAL_BUILTINS because their (anyrange) rows
-- return NULL for an empty range, and name-level dispatch could not tell
-- the text meaning apart — builtin-range-lower-upper.sql pins that side,
-- unchanged. With the argument TYPED, the dispatch resolves the (text) row
-- exactly and reads its signature-keyed verdict
-- (STRICT_TOTAL_BUILTIN_SIGNATURES), so the simplest function in SQL over a
-- NOT NULL text column claims notNull again.
SELECT
  lower(tg.name) AS lo,  -- @notNull
  upper(tg.name) AS hi   -- @notNull
FROM tags tg
