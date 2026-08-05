-- FINDING 10 (rank 1) — the grouping-set ORDINAL spelling resolves against
-- the RAW target list. Sweep-1 finding 9 taught `collectGroupingSetTermKeys`
-- to resolve `ROLLUP(1)` as `targetList[0]`, which is right only when the
-- target list has already been expanded. A star entry is ONE ResTarget and
-- N output columns: `targetList[0]` is `g.*`, whose ColumnRef fields are
-- [String "g", A_Star], so `collectColumnRefKeys` records nothing usable
-- and `groupingSetColumns` comes back EMPTY. The NULLing override then
-- never applies and every grouped key keeps its catalog notNull.
--
-- Falsifying data: INSERT INTO gs VALUES (1, 'b', 'c').
-- Observed: the super-aggregate row [NULL, NULL, NULL, 1].
-- Mechanism: nullability-walk.ts collectGroupingSetTermKeys, the A_Const
-- arm (and the alias arm's `rt?.name` scan, which a star entry also has no
-- name for).
--
-- Two more shapes measured: `GROUP BY GROUPING SETS ((1,2,3,4,5), ())` over
-- two star expansions across a join (five columns claimed notNull, all NULL
-- in the grand-total row), and `GROUP BY CUBE(1)` over a star. The plain
-- spelling `GROUP BY ROLLUP(1, 2)` over explicit refs is CORRECT — the
-- defect is exactly the star entry.
SELECT
  g.*,        -- @notNull a, @notNull b, @notNull c  <-- ALL FALSIFIED
  count(*)    -- @notNull
FROM gs g GROUP BY ROLLUP(1, 2, 3)
