-- The left closed-into-strict exception: (-inf,3] holds the arm's
-- excluded anchor, and cail's a = 3 row — ELSE arm, o NULL — is in the
-- result. The mirror of check-arm-interval-strict-boundary.sql, holding
-- the left-ray cell of the same exception.
SELECT
  o -- @nullable
FROM cail
WHERE a <= 3
