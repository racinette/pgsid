-- The joinState gate holds across the boundary too: the CHECK-discharging
-- predicate lives in an unproven LEFT JOIN's ON qual, so the CTE reference
-- stays OPTIONAL and origin entailment must not speak — a NULL-extended row
-- has no base row at all. sparse: t's row matches guest 1 by id while the
-- status conjunct fails, witnessing the extension.
WITH g AS (SELECT * FROM guest)
SELECT
  h.id AS hid,          -- @notNull
  g.arrived_at AS ga    -- @nullable
FROM t h
LEFT JOIN g ON g.id = h.id AND g.status = 'housed'
