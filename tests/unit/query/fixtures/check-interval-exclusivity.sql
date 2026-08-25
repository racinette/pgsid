-- Interval exclusivity over btree strategies. CHECK (a > 5) is notFALSE per
-- stored row; each claiming column's guard names a set the evaluated
-- anchor order proves disjoint from (5, inf) — the NULL arm never fires,
-- a NULL `a` included (UNKNOWN guard falls to ELSE). The last column's
-- guard OVERLAPS the CHECK's set — a = 6 is a conforming row whose arm
-- fires — and pins that the emptiness table does not blur boundaries.
SELECT
  CASE WHEN t.a <= 3 THEN NULL ELSE 5 END AS ray_gap,      -- @notNull
  CASE WHEN t.a <= 4 THEN NULL ELSE 5 END AS ray_adjacent, -- @notNull
  CASE WHEN t.a = 3  THEN NULL ELSE 5 END AS point_below,  -- @notNull
  CASE WHEN t.a <= 6 THEN NULL ELSE 5 END AS overlap_kept  -- @nullable
FROM tri t
