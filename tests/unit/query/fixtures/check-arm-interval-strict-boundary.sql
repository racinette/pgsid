-- The closed-into-strict exception: [3,inf) and the arm's (3,inf) differ
-- at exactly the shared anchor, and caist's a = 3 row — ELSE arm, o NULL
-- — is in the result. Equal anchors must not carry a closed witness into
-- a strict question; this row of data is what holds that cell of the
-- containment table.
SELECT
  o -- @nullable
FROM caist
WHERE a >= 3
