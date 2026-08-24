-- The closed ray keeps its anchor: [5,inf) CONTAINS the arm's excluded
-- point, and caine's a = 5 row — ELSE arm, o NULL — is in the result.
-- Open-vs-closed at the anchor is the whole difference between this
-- fixture and check-arm-interval-complement.sql.
SELECT
  o -- @nullable
FROM caine
WHERE a >= 5
