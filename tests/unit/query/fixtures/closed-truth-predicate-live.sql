-- `closed-truth-predicate.sql` with `>` turned into `<`, and the opposite
-- verdict.
--
-- The disjunct is now LIVE, so it is the arm that satisfies the predicate on
-- every row, and it proves nothing about `flow` — which is exactly the OR
-- rule working. A reading that dropped closed arms without keeping their
-- polarity straight would drop this one too and claim the column; the rows
-- carry the NULL that contradicts it.
SELECT flow  -- @nullable
FROM mesh
WHERE 1 < 2 OR flow IS NOT NULL
