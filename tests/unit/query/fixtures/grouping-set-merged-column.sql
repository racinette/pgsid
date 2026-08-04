-- A USING-merged grouping column blanks in super-aggregate rows like any
-- other. `mergedColumnNotNull` is a third ColumnRef resolution route beside
-- the two ordinary sites, and it applies the same grouping-set override —
-- it once answered from the constituents' intrinsic flags alone and claimed
-- the ROLLUP's blanked `id` notNull, falsified by the super-aggregate row.
-- That row is the witness; count(*) never nulls. Re-exported through a
-- subquery the merged column is an ordinary column again and the ordinary
-- sites already covered it.
SELECT
  id,        -- @nullable
  count(*)   -- @notNull
FROM t JOIN u USING (id)
GROUP BY ROLLUP (id)
