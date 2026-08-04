-- The output-alias spelling of a grouping-set term: `ROLLUP(k)` names the
-- target entry `t.id AS k`, and the recorder once stored only the key "k"
-- while the consumers ask about "id"/"t.id" — the claim survived re-export
-- through a subquery projection and a CTE star. The bare name now also
-- resolves against ResTarget names and records the selected entry's
-- underlying refs. The grand-total row witnesses the NULL.
SELECT
  t.id AS k,   -- @nullable
  count(*)     -- @notNull
FROM t
GROUP BY ROLLUP(k)
