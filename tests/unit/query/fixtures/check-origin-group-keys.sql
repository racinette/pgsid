-- Group-key origins (Wave 12, née residue-origin-group-keys): every row of
-- a group shares its key values, so sibling KEYS are facts about one real
-- row and the boundary no longer erases them; non-key targets and
-- ROLLUP/CUBE-nulled columns still refuse.
WITH g AS (SELECT status, arrived_at FROM guest GROUP BY status, arrived_at)
SELECT
  arrived_at   -- @notNull
FROM g
WHERE status = 'housed'
