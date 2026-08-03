-- Origin follows RENAMES, pinned by the adversarial swap: the CTE calls
-- base status "arrived_at" and base arrived_at "status". The outer filter
-- on g.arrived_at is therefore a filter on base STATUS, and the selected
-- g.status column is base arrived_at — non-null by the CHECK. An engine
-- matching by NAME instead of by origin would get this exactly backwards.
WITH g AS (SELECT status AS arrived_at, arrived_at AS status FROM guest)
SELECT
  status   -- @notNull
FROM g
WHERE arrived_at = 'housed'
