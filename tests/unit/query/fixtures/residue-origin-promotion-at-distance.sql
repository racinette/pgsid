-- RESIDUE fixture (register section 5): promotion-at-distance. The outer
-- filter proves the LEFT-JOINed guest slice present (a NULL-extended row
-- has NULL status), and the CHECK would then force arrived_at — but
-- origins are produced only for REQUIRED instances, so the boundary
-- swallows it. Today's conservative answer is pinned; an engine that
-- narrows this must flip the annotations, loudly. sparse: t.id 1 joins
-- guest 2 (housed), so the fixture is live and the value in fact non-null.
-- @unwitnessable 0: known imprecision — origin needs the instance REQUIRED,
-- and the presence proof carried by the outer filter is not consumed at a
-- distance. The re-founding's refinement-flow model is expected to close
-- this; the register records it.
WITH g AS (
  SELECT t.id AS tid, x.status, x.arrived_at
  FROM t LEFT JOIN guest x ON x.id = t.id + 1
)
SELECT
  arrived_at   -- @nullable
FROM g
WHERE status = 'housed'
