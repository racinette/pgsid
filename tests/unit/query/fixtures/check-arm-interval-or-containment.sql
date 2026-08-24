-- The disjunctive face of membership transport (graduated 2026-08-24
-- beside the atom rung): TRUE(a >= 4 OR a >= 5) names no single fact,
-- but whichever disjunct held, its set sits inside the arm's [3,inf) —
-- the subset rule's shape with containment where it matches by identity.
SELECT
  o -- @notNull
FROM cai
WHERE a >= 4 OR a >= 5
