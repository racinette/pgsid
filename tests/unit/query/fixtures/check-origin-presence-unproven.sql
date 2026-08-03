-- The presence gate's negative: the filter pins only t's side of the CTE,
-- so nothing certifies the OPTIONAL guest slice and its origins must not
-- speak — dense has t rows and no guest rows at all, witnessing the
-- extension the gate protects against.
WITH g AS (
  SELECT t.id AS tid, x.status, x.arrived_at
  FROM t LEFT JOIN guest x ON x.id = t.id + 1
)
SELECT
  tid,         -- @notNull
  arrived_at   -- @nullable
FROM g
WHERE tid >= 1
