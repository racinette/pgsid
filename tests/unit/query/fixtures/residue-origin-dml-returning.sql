-- RESIDUE fixture (register section 5): origins from DML RETURNING. The
-- returned rows ARE stored guest rows (NEW rows, CHECK-satisfying), so the
-- outer filter could meet the CHECK — but RETURNING outputs carry no
-- origin, deliberately: the OLD/NEW channel model does not yet compose
-- across the CTE boundary. The no-op SET keeps every CHECK trivially
-- satisfied and the statement live in any state with guest rows.
-- @unwitnessable 0: known imprecision — DML RETURNING produces no origins;
-- recorded in the Wave 8 closure and the re-founding target list.
WITH moved AS (
  UPDATE guest SET note = note RETURNING status, arrived_at
)
SELECT
  arrived_at   -- @nullable
FROM moved
WHERE status = 'housed'
