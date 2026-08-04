-- Star expansion over DUPLICATE inner column names — the one legal way to
-- re-export an ambiguous column (any explicit reference to s."id" is
-- rejected by PostgreSQL). Name-based inner resolution first-matched
-- here and claimed column 1 (g.a, null-extended) notNull from column 0's
-- o.id — an unsoundness found by the post-Wave-13 audit and fixed by
-- positional resolution: star expansion hands each consumer the column's
-- ordinal. dense has orders and no gm rows, witnessing column 1's NULL.
SELECT s.* FROM (
  SELECT
    o.id,           -- @notNull
    g.a AS id       -- @nullable
  FROM orders o
  LEFT JOIN gm g ON g.a = o.id
) s
