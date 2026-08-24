-- The lossy-anchor refusal, containment side (found & closed
-- 2026-08-24, the red suite's "lossy anchor read" block): read at cain's
-- INTEGER column the WHERE's 2.4 rounds to 2, and the misread witness
-- {x < 2} would fit the arm's (-inf,2) exactly — but the query compares
-- at numeric, the a = 2 row satisfies `a < 2.4`, took the ELSE arm, and
-- its o NULL is in the result. `litReadExactAt` refuses the fval read at
-- the integer family; the NUMERIC twin that stays claimable is
-- check-arm-interval-left-token.sql.
SELECT
  o -- @nullable
FROM cain
WHERE a < 2.4
