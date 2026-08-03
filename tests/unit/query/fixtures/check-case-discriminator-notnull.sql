-- The motivating CHECK-entailment shape, positive half: guest_arrival_state
-- is notFALSE per stored row, the WHERE makes its WHEN condition's second
-- disjunct TRUE by identity, so the CASE's THEN arm — arrived_at IS NOT NULL
-- — is notFALSE, and IS NOT NULL is total. sparse guest 2 is housed.
SELECT
  id,          -- @notNull
  arrived_at   -- @notNull
FROM guest
WHERE status = 'housed'
