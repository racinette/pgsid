-- The SAME reading on the statement side, where it is the walk's OR rule and
-- not the kernel's.
--
-- `predicateProvesNonNull` requires EVERY disjunct to prove the target
-- non-null — whichever arm made the predicate TRUE, it could not have been
-- TRUE with the target NULL — and that intersection is what keeps `col = $1
-- OR $1 IS NULL` honest. A disjunct that is CONSTANTLY FALSE defeats it for
-- the wrong reason: it proves nothing because it never runs, so the arm
-- beside it doing all the work is discarded along with it.
--
-- Restricting the intersection to arms that CAN fire is the fix, and it needs
-- the same reading the CHECK side needed: `1 > 2` is not a token. It cost
-- nothing extra to get — the statement's closed subtrees are already
-- evaluated by the statement map, so this half of the answer was sitting
-- there unread.
--
-- `closed-truth-predicate-live.sql` is this query one character apart, with
-- the opposite verdict.
SELECT flow  -- @notNull
FROM mesh
WHERE 1 > 2 OR flow IS NOT NULL
