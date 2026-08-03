-- Origins from DML RETURNING (Wave 12, née residue-origin-dml-returning):
-- the returned rows ARE stored guest rows — NEW rows, CHECK-satisfying —
-- so the outer filter meets the CHECK exactly as it would over the table.
WITH moved AS (
  UPDATE guest SET note = note RETURNING status, arrived_at
)
SELECT
  arrived_at   -- @notNull
FROM moved
WHERE status = 'housed'
