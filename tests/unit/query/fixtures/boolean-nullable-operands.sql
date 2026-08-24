-- THE NULLABLE DIRECTION OF THE BOOLEAN CONNECTIVES, PROJECTED.
--
-- The rung census (rung-census.test.ts) found both three-valued refusals dark:
-- every fixture that PROJECTS an AND/OR or a BETWEEN feeds it non-null
-- operands, so "an operand is nullable → three-valued logic" and the BETWEEN
-- twin had never fired on the corpus — the connectives' nullable direction was
-- exercised only inside WHERE clauses, where a conclusion never reaches an
-- output column. A NULL name makes both expressions NULL (UNKNOWN surfaces as
-- NULL in a select list), so the seeded ck.name NULLs witness both claims.
SELECT
  (ck.name = 'x' AND ck.id = 1) AS tv_and,     -- @nullable
  (ck.name BETWEEN 'a' AND 'z') AS tv_between  -- @nullable
FROM ck
