-- Arm-implication in the subset rule: the first disjunct is a CONJUNCTION,
-- but whichever arm held, all its conjuncts held — so `status = 'arrived'`
-- standing in for its arm (A∧B ⇒ A) makes the OR-fact cover the CHECK
-- CASE's WHEN disjunction. Before Wave 11 a compound arm refused the whole
-- fact.
SELECT
  arrived_at   -- @notNull
FROM guest
WHERE (status = 'arrived' AND id > 0) OR status = 'housed'
