-- Generated-column reverse entailment, the motivating example verbatim:
-- verdict IS its CASE expression per stored row (an EQUALITY, stronger than
-- a CHECK's notFALSE), so TRUE(verdict = 'fraud') excludes every arm whose
-- literal result is provably distinct ('manual-check', 'no-fraud' — text
-- under a deterministic collation) and the NULL ELSE (a TRUE equality has
-- no NULL side). The lone survivor's condition fraud_score >= 75 held, and
-- a TRUE strict comparison pins its operand.
SELECT
  id,           -- @notNull
  fraud_score   -- @notNull
FROM txn
WHERE verdict = 'fraud'
