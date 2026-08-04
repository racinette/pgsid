-- ADVERSARIAL FINDING 9 (second spelling) — rank 1, notNull unsoundness.
-- See grouping-set-ordinal-alias.sql for the mechanism.
--
-- `GROUP BY ROLLUP(k)` names the output alias; the grouping-set recorder
-- stores "k" while the ColumnRef consumers ask about "id" / "t.id".
SELECT
  t.id AS k,   -- @notNull  <-- FALSE: NULL in the super-aggregate row
  count(*)     -- @notNull
FROM t
GROUP BY ROLLUP(k)
