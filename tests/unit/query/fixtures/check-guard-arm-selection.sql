-- The second atom-oracle rung: WHERE evidence selects a CASE-shaped
-- CHECK's arm. `b IS TRUE` shapes into TRUE(b), which selects the CHECK's
-- THEN arm — notFALSE(a < 5) for every returned row — and trichotomy
-- refutes the query's `a > 5` guard: the NULL arm never fires. The
-- companion column is the overreach control the red suite also guards:
-- under the same evidence `a <= 5` is freely TRUE (the CHECK constrains
-- a < 5, not its negation), the arm fires on real rows, and a claim here
-- would reject what PostgreSQL returns — witnessed nullable.
SELECT
  CASE WHEN a > 5 THEN NULL ELSE 5 END AS a1,   -- @notNull
  CASE WHEN a <= 5 THEN NULL ELSE 5 END AS a3   -- @nullable
FROM bcorr
WHERE b IS TRUE
