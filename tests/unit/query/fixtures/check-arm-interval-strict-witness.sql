-- The strict witness inside a closed arm, EQUAL anchors: (3,inf) fits
-- [3,inf) because x > 3 already implies x >= 3 — the eq allowance on the
-- same-direction row of the containment table. Identity cannot see this
-- pair (the operators differ); the shapes and the anchor relation do.
SELECT
  o -- @notNull
FROM cai
WHERE a > 3
