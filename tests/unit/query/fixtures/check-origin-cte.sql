-- Origin tracking, the motivating case: the CTE's columns are bare
-- pass-throughs of guest, each carrying its rowPath out of the body, so the
-- OUTER filter meets the base table's CHECKs again — the scope boundary no
-- longer erases what the columns ARE. note has no constraint on the housed
-- arm and stays nullable, witnessed by the housed row's NULL note.
WITH g AS (SELECT * FROM guest)
SELECT
  id,          -- @notNull
  arrived_at,  -- @notNull
  room,        -- @notNull
  note         -- @nullable
FROM g
WHERE status = 'housed'
