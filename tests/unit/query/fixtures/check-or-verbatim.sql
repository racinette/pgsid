-- The same subset rule at its boundary case: the WHERE is the CHECK's WHEN
-- condition verbatim (subset = the whole set). Before Wave 7 even this
-- exact-identity OR stayed dark, because OR-shaped evidence was never
-- stored as a fact at all.
SELECT
  arrived_at   -- @notNull
FROM guest
WHERE status = 'arrived' OR status = 'housed'
