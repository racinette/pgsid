-- The origin-side route to the same NO INHERIT hole: the CTE re-exports
-- ni2_p's columns as bare pass-throughs and the filter sits OUTSIDE, so
-- the CHECK runs at the referencing scope through origin tracking (Wave 8)
-- rather than the flat resolver. Origins carry no ONLY bit, so the origin
-- consumer takes the tree CHECK list UNCONDITIONALLY — the same
-- conservative reading it already takes for notNullTree — and ni2_c's
-- open/NULL rows witness the dropped claim here exactly as they do in the
-- direct spelling.
WITH w AS (SELECT p.id, p.status, p.note FROM ni2_p p)
SELECT
  w.id,   -- @notNull
  w.note  -- @nullable
FROM w WHERE w.status = 'open'
