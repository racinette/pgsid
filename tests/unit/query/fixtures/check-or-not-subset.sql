-- The subset rule's negative: 'checked-out' is not in the WHEN set, so the
-- OR-fact is no subset of the CHECK's disjunction and proves nothing — and
-- rightly, since the CASE's ELSE forces arrived_at NULL on checked-out
-- rows, which is exactly the witness sparse provides.
SELECT
  arrived_at   -- @nullable
FROM guest
WHERE status IN ('housed', 'checked-out')
