-- Row identity is the PATH of reference instances, not the base table: g1
-- and g2 read the same memoized CTE analysis, but each reference prepends
-- its own instance, so g1's discriminator says nothing about g2's row —
-- witnessed by pairing the housed g1 with the in-flight g2, whose
-- arrived_at is NULL. The same evidence DOES prove g1's own column.
WITH g AS (SELECT * FROM guest)
SELECT
  g1.arrived_at AS a1,  -- @notNull
  g2.arrived_at AS a2   -- @nullable
FROM g g1, g g2
WHERE g1.status = 'housed'
