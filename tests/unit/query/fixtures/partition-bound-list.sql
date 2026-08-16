-- The list-partition twin of the CHECK IN case (same code path, the
-- rung's second payer): courier_north's bound renders
-- ((region IS NOT NULL) AND (region = ANY (ARRAY['north','east']))) and
-- feeds a direct scan at validated-CHECK grade. The prefix claims the
-- key; the membership excludes the outside point. The member control
-- keeps the boundary: the generator's first row is 'north'
-- (deterministic ctx.row rotation), firing the arm in every data state.
-- Guard-side IN (landed 2026-08-16): an IN-spelled guard over the same
-- bound refutes through the same arms, and its NOT IN twin stays nullable
-- — every stored region is 'north' or 'east', so the conjunction is TRUE
-- on every row.
SELECT
  c.region AS key_notnull,                                              -- @notNull
  CASE WHEN c.region = 'west' THEN NULL ELSE 5 END AS outside_point,    -- @notNull
  CASE WHEN c.region = 'north' THEN NULL ELSE 5 END AS member_kept,     -- @nullable
  CASE WHEN c.region IN ('west', 'south')
       THEN NULL ELSE 5 END AS outside_in_list,                         -- @notNull
  CASE WHEN c.region NOT IN ('west', 'south')
       THEN NULL ELSE 5 END AS not_in_kept                              -- @nullable
FROM courier_north c
