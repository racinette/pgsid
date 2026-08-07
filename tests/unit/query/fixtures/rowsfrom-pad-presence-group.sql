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
-- @unwitnessable 3: generate_series is the LONGER arm and is never padded,
--   and the LATERAL runs per order row, so it is non-null wherever a row
--   exists at all
SELECT
  o.id,               -- @notNull
  x.a,                -- @nullable
  x.b,                -- @nullable
  x.generate_series   -- @nullable
FROM orders o
LEFT JOIN LATERAL ROWS FROM (sw4_tab_srf(o.id), generate_series(1, 3)) x ON true
