-- The same padding hazard through the multi-WHEN CASE consumer: reaching
-- the CHECK's second arm (k = 'a ' → x IS NOT NULL) requires the FIRST
-- arm's k = 'a' provably FALSE, which for bpchar it never is — the stored
-- 'a   ' row satisfies BOTH tokens' comparisons and took the first arm
-- (x IS NULL). The engine refuses the arm step, so x stays nullable,
-- witnessed by exactly that row.
SELECT
  b.x,  -- @nullable
  b.k   -- @notNull
FROM bp2 b
WHERE b.k = 'a '
