-- The transport's STRENGTH gate, held by data: caiw's ray CHECK
-- (a >= 4) is only notFALSE per stored row, and nothing here pins `a` —
-- so its a-NULL rows are real, took the ELSE arm (guard UNKNOWN), and
-- put o's NULL in every result. A transport widened to notFALSE
-- witnesses would select the `a >= 3` arm and PostgreSQL would falsify
-- the claim on exactly those rows. TRUE facts only: a notFALSE witness
-- may be NULL, and the question is NULL beside it, not TRUE.
SELECT
  o -- @nullable
FROM caiw
WHERE b <> 0
