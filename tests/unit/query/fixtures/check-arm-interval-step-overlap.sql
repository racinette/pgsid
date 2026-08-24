-- Stepping needs the refutation to actually hold: a <= 6 overlaps the
-- first guard's (5,inf) — the a = 6 row fired it and carries the o NULL
-- its arm enforces — so the harvest must stay at the first arm and
-- claim nothing. The boundary that keeps notTRUE stepping a judgment,
-- not a habit.
SELECT
  o -- @nullable
FROM caie
WHERE a <= 6
