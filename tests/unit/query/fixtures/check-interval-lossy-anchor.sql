-- The lossy-anchor refusal, exclusivity side (found & closed 2026-08-24,
-- the red suite's "lossy anchor read" block): read at ivne's INTEGER
-- column the WHERE's 3.4 rounds to 3, and the misread witness {x < 3}
-- would miss the guard's point entirely — but z = 3 satisfies `z < 3.4`
-- at the numeric comparison the query actually runs, fires the arm, and
-- its NULL is in every result (the generator's first z). The nullable
-- below is `litReadExactAt` holding: no anchor relation, no refutation.
SELECT
  CASE WHEN t.z = 3 THEN NULL ELSE 5 END AS lossy_refused -- @nullable
FROM ivne t
WHERE t.z < 3.4
