-- Arm selection by interval CONTAINMENT (the check-arm-interval red
-- suite, graduated 2026-08-24): [4,inf) sits inside the arm's [3,inf)
-- because 4 > 3 — membership transport over the evaluated anchor order,
-- where selection used to need the guard atom-for-atom. Every returned
-- row was CHECK-enforced through the `a >= 3` arm at write time, so o
-- carries a value on all of them; a pins itself by its own comparison.
SELECT
  a, -- @notNull
  o  -- @notNull
FROM cai
WHERE a >= 4
