-- CASE-shaped joint implicants: covering every arm's RESULT (the implicit
-- NULL ELSE included) makes the claim hold whichever arm runs, without
-- touching the conditions — this CASE is COALESCE($1, $2) in different
-- clothes and yields the same irreducible {1, 2}. sparse's u rows witness
-- the all-members-NULL raise; each member's own nullable claim is checked
-- by binding it alone.
-- @args ["case-a@x.y", "case-b@x.y", 0]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param-reject 1,2
-- (The condition's cast is PostgreSQL type deduction, measured: a bare
-- `$1 IS NOT NULL` fails PREPARE before the THEN's unification is reached.)
UPDATE u
SET email = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE $2 END
WHERE u.id >= $3
RETURNING
  id   -- @notNull
