-- The ORIGINS face of the dup-name star hazard, execution-falsifiable:
-- the inner self-join pairs DIFFERENT guest rows (g2.id = g1.id + 1) and
-- exports both status columns under one name; the middle star expansion
-- attributes origins, and the outer CTE column list renames positionally
-- so the formerly-ambiguous column becomes referenceable. Under
-- first-name-match, status2 would have carried g1's rowPath — the WHERE
-- would falsely pin g1's row as housed and guest_housed_room would claim
-- room1 notNull, falsified by sparse's (g1=1 in-flight/room NULL,
-- g2=2 housed) pair. Positionally resolved, status2 rides g2's rowPath,
-- the rowPaths differ, entailment stays silent, and room1 is nullable —
-- witnessed by exactly that sparse row.
WITH j (status1, room1, status2) AS (
  SELECT s.* FROM (
    SELECT g1.status, g1.room, g2.status
    FROM guest g1 JOIN guest g2 ON g2.id = g1.id + 1
  ) s
)
SELECT
  j.status2,   -- @notNull
  j.room1      -- @nullable
FROM j
WHERE j.status2 = 'housed'
