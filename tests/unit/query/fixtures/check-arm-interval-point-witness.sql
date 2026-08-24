-- A POINT witness by HARVEST: nothing in this statement says `a = 7` —
-- the equality is caipt's own CHECK, promoted from notFALSE to TRUE in
-- the fixpoint round after the WHERE pins `a` non-null. The
-- equality-anchored oracle cannot shadow this route (its question key,
-- `7 >= 3` at integer, pairs a statement-side equality the statement
-- does not have), so the containment table's point row is the only
-- prover: {7} fits [3,inf) because 7 > 3. The WHERE's own witness
-- refuses on its anchors (0 < 3), keeping the kill clean.
SELECT
  o -- @notNull
FROM caipt
WHERE a >= 0
