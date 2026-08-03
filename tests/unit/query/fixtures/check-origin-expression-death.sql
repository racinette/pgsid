-- Origin dies at any transforming expression: upper(status) is no longer
-- the stored discriminator, so the outer filter — though it happens to
-- select exactly the housed row — cannot be carried back to the base
-- table's CHECK. The value is in fact non-null on every selected row,
-- which is precisely why the claim needs its reason recorded instead of a
-- witness.
-- @unwitnessable 0: the filter selects only housed rows, whose arrived_at
-- the CHECK forces non-null; the engine's origin died at upper(status) by
-- design, so the imprecision is recorded, not witnessed.
WITH g AS (SELECT upper(status) AS status, arrived_at FROM guest)
SELECT
  arrived_at   -- @nullable
FROM g
WHERE status = 'HOUSED'
