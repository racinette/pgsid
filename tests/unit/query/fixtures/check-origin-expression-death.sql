-- Origin dies at any transforming expression: upper(status) is no longer
-- the stored discriminator, so the outer filter — though it happens to
-- select exactly the housed row — cannot be carried back to the base
-- table's CHECK. The value is in fact non-null on every selected row,
-- which is precisely why the claim needs its reason recorded instead of a
-- witness.
-- The recorded reason used to stop one step short, and the step it skipped is
-- the whole difficulty. It said the filter selects only housed rows, whose
-- arrived_at the CHECK forces non-null. But the CHECK tests the BARE column
-- against 'housed', and `upper(status) = 'HOUSED'` does not imply
-- `status = 'housed'` — a row storing 'HOUSED' satisfies the filter and takes
-- the CHECK's ELSE branch, which requires arrived_at IS NULL.
--
-- That row cannot be SEEDED, because a second constraint closes the column:
-- `guest_status_note` requires status IN ('in-flight','arrived','housed',
-- 'checked-out'), all lowercase. So the implication does hold here — and only
-- because of a constraint the filter never mentions. Carrying an origin
-- through `upper` would mean proving the transform injective ON THE VALUES
-- THE SCHEMA ADMITS, which is a different and much larger claim than the one
-- the old reason implied was sitting there.
-- @unwitnessable 0: the value is non-null on every selected row, but only
--   because a SECOND CHECK closes status to lowercase spellings; carrying the
--   origin needs upper() proven injective over that admitted set, so the
--   refusal is recorded rather than witnessed
WITH g AS (SELECT upper(status) AS status, arrived_at FROM guest)
SELECT
  arrived_at   -- @nullable
FROM g
WHERE status = 'HOUSED'
