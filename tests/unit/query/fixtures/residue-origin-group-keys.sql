-- RESIDUE fixture (register section 5): group-key origins. A GROUP BY
-- key's value is a real row's value — keeping origins for grouping columns
-- would be sound — but origin production dies at any groupClause today.
-- The housed group's arrived_at is in fact non-null by the CHECK.
-- @unwitnessable 0: known imprecision — origins die at GROUP BY although
-- group keys carry real row values; recorded in the Wave 8 closure and
-- the re-founding target list.
WITH g AS (SELECT status, arrived_at FROM guest GROUP BY status, arrived_at)
SELECT
  arrived_at   -- @nullable
FROM g
WHERE status = 'housed'
