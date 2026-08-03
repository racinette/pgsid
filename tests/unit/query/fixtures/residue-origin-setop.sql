-- RESIDUE fixture (register section 5): origins through set operations.
-- Both branches are bare pass-throughs of guest, so every output row IS a
-- guest row and the outer filter could meet the CHECK — but a UNION column
-- would need an origin-SET ("one of these rowPaths"), and origins die at
-- the setop instead. Provenance-semiring composition is the expected
-- closure. The selected rows' arrived_at is in fact non-null.
-- @unwitnessable 0: known imprecision — origins die at set operations;
-- recorded in the Wave 8 closure and the re-founding target list.
WITH g AS (
  SELECT * FROM guest WHERE id < 100
  UNION ALL
  SELECT * FROM guest WHERE id >= 100
)
SELECT
  arrived_at   -- @nullable
FROM g
WHERE status = 'housed'
