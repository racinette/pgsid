-- The OR-fact subset rule: TRUE(status IN (a, h)) names no single arm, but
-- it makes any superset disjunction TRUE — here the CHECK CASE's WHEN
-- condition, whose disjunct set contains both arms. sparse has an arrived
-- and a housed guest, so the notNull claim is falsifiable on both arms.
SELECT
  id,          -- @notNull
  arrived_at   -- @notNull
FROM guest
WHERE status IN ('arrived', 'housed')
