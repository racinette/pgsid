-- Arm stepping by notTRUE (graduated 2026-08-24): TRUE(a <= 3) proves
-- caie's first guard `a > 5` notTRUE — interval exclusivity, never FALSE
-- — and a guard that is FALSE or NULL skips its arm exactly the same
-- way, so the harvest falls through to the ELSE, where o IS NOT NULL is
-- the CHECK's own enforcement on every returned row.
SELECT
  o -- @notNull
FROM caie
WHERE a <= 3
