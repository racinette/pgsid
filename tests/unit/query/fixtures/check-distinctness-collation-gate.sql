-- The collation gate itself: tag's collation is nondeterministic, so byte
-- distinctness proves nothing — under real ICU, WHERE tag = 'A' returns
-- the stored ('a', NULL) row whose FIRST arm was the true one, and an
-- ungated engine falsifying it by bytes would claim x non-null against
-- that row's NULL. The engine therefore refuses and x stays nullable.
-- @unwitnessable 0: the witness is the ('a', NULL) row a real
--   case-insensitive match would return; PGlite's ICU is catalog-only
--   (measured: 'a' = 'A' is false here), so only the ('A', 'ax') liveness
--   row matches and its x is CHECK-forced non-null. The refusal is held by
--   the annotation.
SELECT
  x   -- @nullable
FROM nd
WHERE tag = 'A'
