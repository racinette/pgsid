-- Simple CASE in a CHECK, desugared: `CASE code WHEN 'assigned'` IS the
-- equality `code = 'assigned'`, synthesized by the kernel and judged by the
-- ordinary fragment — the WHERE discharges it and the arm's combo IS NOT
-- NULL becomes a harvested FACT (totality), which the second constraint's
-- OR consumes in the next fixpoint round: inter-CHECK chaining, Wave 11b.
-- This fixture briefly pinned the chaining GAP with an @unwitnessable on
-- opened_at; the annotation came off the moment the engine caught up,
-- exactly as the residue mechanism is designed to force.
SELECT
  combo,      -- @notNull
  opened_at   -- @notNull
FROM locker
WHERE code = 'assigned'
