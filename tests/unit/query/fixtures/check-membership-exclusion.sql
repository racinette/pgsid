-- List membership exclusion (docs/subtree-evaluation.md; landed
-- 2026-08-16), the CHECK IN side. guest_status_note's AND carries
-- `status IN ('in-flight','arrived','housed','checked-out')` — rendered
-- `= ANY (ARRAY[...])`, a notFALSE OR-fact on the constraint's spine. A
-- guard naming a point OUTSIDE the list is excluded by every member
-- (point-vs-point distinctness through the anchor questions), and a ray
-- BELOW every member is excluded the same way (order on the identity
-- collation arm) — neither arm can ever fire. A guard naming a MEMBER is
-- untouched: the 'arrived' rows fire it and witness the NULL.
-- Guard-side IN (landed 2026-08-16): the same questions spelled as an IN
-- list reach the same answers — the guard desugars into the arms the OR
-- rule already walks. NOT IN is a conjunction and keeps its nullability:
-- every guest row's status is one of the four members, so `NOT IN
-- ('cancelled','void')` is TRUE on every row and witnesses the NULL.
SELECT
  CASE WHEN g.status = 'cancelled' THEN NULL ELSE 5 END AS outside_point, -- @notNull
  CASE WHEN g.status < 'a' THEN NULL ELSE 5 END AS outside_ray,           -- @notNull
  CASE WHEN g.status = 'arrived' THEN NULL ELSE 5 END AS member_kept,     -- @nullable
  CASE WHEN g.status IN ('cancelled', 'void')
       THEN NULL ELSE 5 END AS outside_in_list,                           -- @notNull
  CASE WHEN g.status IN ('arrived', 'cancelled')
       THEN NULL ELSE 5 END AS member_in_list_kept,                       -- @nullable
  CASE WHEN g.status NOT IN ('cancelled', 'void')
       THEN NULL ELSE 5 END AS not_in_kept                                -- @nullable
FROM guest g
