-- The other half of the boundary: the EVIDENCE is outside and the CHECK is
-- inside. `check-null-goal-across-boundary.sql` covers the easy direction —
-- the inner statement already proved the claim and a bare re-export carries
-- it out. Here the inner statement proves nothing (no filter in there at
-- all); the outer WHERE is what selects the CASE's ELSE arm, and reaching
-- the CHECK from out here is what `originCheckEntailment` is for. It takes
-- the mirror goal now, which is one flag rather than a second copy of the
-- rowPath and rename machinery.
--
-- One thing the null goal does NOT want is the presence gate. For a non-null
-- goal an optional chain must be proven present before any CHECK fact
-- applies, because a NULL-extended row satisfies no constraint. For a null
-- goal that same unproven presence is an ANSWER: an absent row nulls the
-- column outright. So the rows the facts cannot speak for are exactly the
-- rows that speak for themselves, and passing the gate would refuse them.
--
-- `arrived_v` runs it through a VIEW, whose stored definition is analysed
-- the same way; `arrived_when_arrived` is the direction control on the same
-- CHECK — 'arrived' takes the THEN arm, so the engine must say notNull
-- there and would be caught by execution if it said anything else.
WITH c AS (SELECT id, status, arrived_at FROM guest)
SELECT
  s.arrived_at AS arrived_sub,          -- @alwaysNull  subquery + outer WHERE
  c.arrived_at AS arrived_cte,          -- @alwaysNull  CTE + outer WHERE
  v.arrived_at AS arrived_v,            -- @alwaysNull  view + outer WHERE
  a.arrived_at AS arrived_when_arrived  -- @notNull     the THEN arm, same CHECK
-- `a` is CROSS JOINed, not keyed to `s`: keyed, it would be the same guest
-- row required to be both 'in-flight' and 'arrived', the query would return
-- nothing under every data state, and the suite's no-rows check would fail
-- it as a fixture that asserts nothing. A separate guest is the point.
FROM (SELECT id, status, arrived_at FROM guest) s
JOIN c ON c.id = s.id
JOIN guest_directory v ON v.id = s.id
CROSS JOIN guest a
WHERE s.status = 'in-flight'
  AND c.status = 'in-flight'
  AND v.status = 'in-flight'
  AND a.status = 'arrived'
