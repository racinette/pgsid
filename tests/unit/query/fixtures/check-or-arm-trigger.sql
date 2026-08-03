-- OR-facts as arm-exclusion triggers: TRUE(verdict IN ('fraud','no-fraud'))
-- names no arm, but each value selects exactly one generated-CASE arm, so
-- the disjunction of their conditions held — fraud_score >= 75 OR
-- fraud_score < 30, both strict over fraud_score, which the intersection
-- rule pins. The mixed set with 'manual-check' (two producing arms, one an
-- IS NULL condition) stays correctly dark — see the ambiguity fixture.
SELECT
  id,           -- @notNull
  fraud_score   -- @notNull
FROM txn
WHERE verdict IN ('fraud', 'no-fraud')
