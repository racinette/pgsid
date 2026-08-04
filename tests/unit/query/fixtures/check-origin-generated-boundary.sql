-- The kernel-boundary closure: pinning g2.label proves g2's row present
-- (presence consumption), and given presence, safe_label and doubled are
-- non-null BY THEIR GENERATION EXPRESSIONS — a fact the entailment
-- kernel's atoms cannot state (no COALESCE, no arithmetic) but the walk
-- now proves for the origin in a synthetic single-table scope
-- (storedRowNotNull), feeding the same kernel short-circuit the catalog
-- flag uses. Before the closure both stayed nullable with NULLs the pin
-- excluded (the retired gm-generated-kernel-boundary rule). sparse:
-- gm.1 walks to gm.2, whose label 'bee!' survives the pin.
WITH j AS (
  SELECT g1.a AS a1, g2.safe_label AS sl, g2.doubled AS dbl, g2.label AS lbl
  FROM gm g1
  LEFT JOIN gm g2 ON g2.a = g1.a + 1
)
SELECT
  j.a1,    -- @notNull
  j.sl,    -- @notNull
  j.dbl,   -- @notNull
  j.lbl    -- @notNull
FROM j
WHERE j.lbl IS NOT NULL
