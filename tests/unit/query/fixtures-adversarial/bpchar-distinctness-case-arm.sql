-- ADVERSARIAL FINDING 4 (second rendering) — rank 1, notNull unsoundness.
--
-- The multi-WHEN CASE consumer of the same judgment. Falsifying data:
-- `INSERT INTO bp2 VALUES ('a', NULL);` — stored 'a   ', admissible because
-- the CASE's FIRST arm (`k = 'a'`) is TRUE and requires x IS NULL.
-- Observed: PostgreSQL returns (NULL, 'a   ').
--
-- The engine falsifies the first arm by distinctness ('a ' vs 'a'), steps to
-- the second arm, matches its condition against the WHERE fact by identity,
-- and derives `x IS NOT NULL` — from an arm the stored row never took.
SELECT
  b.x,  -- @notNull  <-- FALSE
  b.k   -- @notNull
FROM bp2 b
WHERE b.k = 'a '
