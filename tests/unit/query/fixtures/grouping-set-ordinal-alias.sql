-- The output-ordinal spelling of a grouping-set term: `ROLLUP(1)` is an
-- A_Const, not a ColumnRef, and the recorder once collected nothing for it
-- — claiming t.id notNull against the super-aggregate row that blanks it.
-- The ordinal now selects the first target entry and records its underlying
-- refs, so the consumers asking about "id"/"t.id" land. The grand-total row
-- witnesses the NULL under every data state, empty included.
SELECT
  t.id,      -- @nullable
  count(*)   -- @notNull
FROM t
GROUP BY ROLLUP(1)
