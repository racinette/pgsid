-- Predicate-aware GENERATED columns (generated-predicate-red.test.ts,
-- graduated 2026-08-25). gpc carries NO CHECK, so every mechanism in the
-- chain is the new one: the anchor-question pool draws `3` and `10` from
-- the GENERATION expression (from CHECKs alone it drew nothing at all and
-- synthesized zero questions), the kernel runs on EVIDENCE alone with no
-- constraint to derive from, and it answers the guards in both
-- directions — `a <= 3` refuted, `a <= 10` proven — so the CASE stops at
-- its second arm and the ELSE's NULL is unreachable. Every row this
-- returns holds the literal 'maybe'.
SELECT
  c -- @notNull
FROM gpc
WHERE a = 7
