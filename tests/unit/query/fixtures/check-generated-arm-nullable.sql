-- The ambiguous verdict: TWO arms produce 'manual-check' (the 30..75 range
-- and the IS NULL arm), so no single condition is selected and fraud_score
-- stays nullable — which is the truth: txn 4's NULL fraud_score IS a
-- manual-check row, and witnesses the claim.
SELECT
  fraud_score   -- @nullable
FROM txn
WHERE verdict = 'manual-check'
