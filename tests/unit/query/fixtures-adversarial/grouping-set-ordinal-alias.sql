-- ADVERSARIAL FINDING 9 — rank 1, notNull unsoundness.
--
-- Falsifying data: one `t` row.
-- Observed: both statements' super-aggregate rows have the grouping column
-- NULL; the engine claims it notNull.
--
-- Suspected mechanism: `collectGroupingSetColumns` (nullability-walk.ts)
-- records only ColumnRefs found inside a `GroupingSet` term, keyed by
-- `col` and `alias.col`. PostgreSQL accepts two other spellings for a GROUP BY
-- term and neither produces a matching key:
--
--   GROUP BY ROLLUP(1)  — an output-column ORDINAL is an A_Const, so nothing
--                         is recorded at all;
--   GROUP BY ROLLUP(k)  — an output-column ALIAS records the key "k", while
--                         the consumers ask about the underlying column
--                         ("id" / "t.id"), so it never matches.
--
-- Both spellings are ordinary SQL, and the escape survives re-export: the
-- claim stays wrong through a subquery projection and through a CTE star
-- (measured). A plain `GROUP BY 1` with no grouping-set construct is
-- unaffected — there is no super-aggregate row to blank.
--
-- Two statements, one per spelling; the fix phase should keep both.
SELECT
  t.id,      -- @notNull  <-- FALSE (ordinal spelling)
  count(*)   -- @notNull
FROM t
GROUP BY ROLLUP(1)
