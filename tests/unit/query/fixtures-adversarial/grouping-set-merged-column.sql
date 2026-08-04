-- ADVERSARIAL FINDING 8 — rank 1, notNull unsoundness.
--
-- Falsifying data: one matching `t`/`u` pair on id 1.
-- Observed: PostgreSQL returns two rows, and the super-aggregate row has
-- `id` NULL — ROLLUP blanks the grouping column — while the engine claims it
-- notNull.
--
-- Suspected mechanism: `mergedColumnNotNull` (nullability-walk.ts) answers a
-- USING/NATURAL-merged column from its two constituents'
-- `relationColumnsIntrinsic` and never consults `scope.groupingSetColumns`.
-- The ordinary ColumnRef path does consult it (two call sites, and the check
-- deliberately overrides both the catalog flag and any WHERE guarantee);
-- the merged path is a third resolution route that bypasses the override.
--
-- The same falsification lands under NATURAL FULL JOIN
-- (`SELECT id, count(*) FROM t NATURAL FULL JOIN u GROUP BY ROLLUP(id)`), and
-- does NOT land when the merged column is re-exported through a subquery
-- first — outside, it is an ordinary column again.
SELECT
  id,        -- @notNull  <-- FALSE: NULL in the super-aggregate row
  count(*)   -- @notNull
FROM t JOIN u USING (id)
GROUP BY ROLLUP(id)
