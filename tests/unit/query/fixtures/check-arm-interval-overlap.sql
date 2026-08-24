-- The overlap boundary: [2,inf) reaches BELOW the arm's [3,inf), and the
-- a = 2 row — ELSE arm, o IS NULL enforced at write — is in every
-- result. A witness anchored short of the question's proves nothing,
-- whatever it shares above it.
SELECT
  o -- @nullable
FROM cai
WHERE a >= 2
