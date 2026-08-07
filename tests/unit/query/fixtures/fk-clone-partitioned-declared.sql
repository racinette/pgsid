-- The claim the clone capture was COSTING, recovered: joining the DECLARED
-- parent — the shape anyone would actually write.
--
-- `sw4_pref.p_id` is NOT NULL and references `sw4_pp(id)`, so every
-- referencing row matches somewhere in the partition tree and the LEFT JOIN
-- never extends. Before the fix this promoted nothing, because the declared
-- target had been overwritten by whichever clone the snapshot ordered last.
--
-- Recorded as its own fixture because it is the half of finding 4 that is a
-- PRECISION recovery rather than a soundness fix, and because it is the
-- direction a regression would take first: a capture that over-filters loses
-- this claim silently while the unsound sibling stays green.
SELECT
  p.id AS pid,   -- @notNull   (the declared key over the whole tree)
  p.k            -- @nullable
FROM sw4_pref r
LEFT JOIN sw4_pp p ON p.id = r.p_id
