-- Finding 1's RANK-4 face, and what it looks like once the flag is gone: NO
-- presence group is emitted here at all.
--
--     id | a      | b      | generate_series
--     ---+--------+--------+-----------------
--      5 | v      |      5 |               1
--      5 | (null) | (null) |               2
--      5 | (null) | (null) |               3
--
-- Before the fix the engine emitted `{ columns: [1,2,3], discriminants: [1] }`
-- — `a` was a discriminant precisely BECAUSE the declared NOT NULL domain
-- reading survived the padding, and a group needs at least one. On rows two
-- and three that discriminant is NULL, which the group's contract reads as
-- "the unit was ABSENT", while member 3 is 2 and 3: a factored discriminated
-- union whose discriminant does not discriminate.
--
-- It is recorded separately from the flag because it is a different CLAIM KIND
-- reaching the consumer by a different route, and because it says where the
-- fix had to sit — before the group assembly reads the flags, not after.
-- Clearing them removes the group rather than correcting it, and the absence
-- is the assertion: engine-claimed groups are checked against `@null-group`
-- annotations in both directions.
-- The per-arm clip (2026-08-22) put this fixture's assertion under real
-- pressure and it held, from the other side: `generate_series` now KEEPS its
-- flags, which makes it a discriminant, and a unit spanning both arms would
-- then read "the unit is present" on the very rows the padding has emptied —
-- the same contract violation, discriminant swapped. A padded arm's columns
-- are no part of the item's presence unit, so `a` and `b` leave the unit and
-- the group is still absent. That absence is still the assertion.
-- @planner-keeps 1: the walk settles this LEFT JOIN from the ARM's guaranteed
--   row count; the planner leaves the join in place, because a set-returning
--   function's cardinality is an estimate to it and never a proof
-- `generate_series` is notNull, and the route there was written down here
-- before it was built: the arm is not padded (it is the longest), so the only
-- thing that could null it was the LEFT JOIN's extension — and the extension
-- never fires, because `generate_series(1, 3)` guarantees the item three rows.
-- That minimum is the SAME number the padding bound already computes; the join
-- state simply never asked for it. It does now, and the answer promotes the
-- item to REQUIRED.
--
-- Both halves are needed and both are gated. `ON true` is the other one: a
-- qual that can be false or NULL extends the row no matter how many rows the
-- item has, so the literal is the whole test.
--
-- `a` and `b` stay nullable for the OTHER reason — the strict SRF returns no
-- rows for a NULL argument, and the lockstep padding fills its columns while
-- the item is present. That is the distinction this fixture exists for: a
-- PADDED arm and an ABSENT item null the same columns and are not the same
-- fact, which is why the padded columns leave the presence unit.
SELECT
  o.id,               -- @notNull
  x.a,                -- @nullable
  x.b,                -- @nullable
  x.generate_series   -- @notNull
FROM orders o
LEFT JOIN LATERAL ROWS FROM (sw4_tab_srf(o.id), generate_series(1, 3)) x ON true
