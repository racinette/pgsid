-- Comparison harvesting, chained across constraints: the WHERE selects
-- CHECK₁'s team arm; its `seats IS NOT NULL` is harvested, which pins the
-- operand of its `seats > 1` — a total+strict comparison over pinned
-- operands cannot be NULL, so its notFALSE promotes to TRUE — which
-- negator-falsifies CHECK₂'s same-token `seats <= 1` and forces the
-- contact. Token-pure end to end: no literal is ever compared by value.
-- This file was residue-comparison-harvest.sql, @unwitnessable, until the
-- engine caught up and the suite forced the flip — the ritual's second
-- firing.
SELECT
  overflow_contact   -- @notNull
FROM subscription
WHERE plan = 'team'
