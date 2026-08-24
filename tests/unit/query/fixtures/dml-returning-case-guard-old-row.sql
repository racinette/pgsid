-- The DML refusal in `guardTruthFromChecks`, witnessed. The kernel's
-- guard consumer reads the WHERE unmasked — it has no OLD/NEW channel
-- split, which is why it declines a scope with SET columns outright —
-- and this statement is where the difference shows: `WHERE active`
-- describes the OLD row, RETURNING reads the NEW one, and the SET
-- inverts exactly the column the guard tests. Every returned row has
-- `active` FALSE, so every one of them takes the ELSE.
--
-- The refusal used to be unkillable by the corpus and this file exists
-- because it stopped being honest to say so: the guard consumer gained
-- the TRUE direction on 2026-08-25, and TRUE(active) read off the WHERE
-- would select the first arm and claim notNull. PostgreSQL returns NULL.
--
-- The written-value pass cannot rescue it either, and that is the second
-- half of the design: `NOT active` is not a constant, so there is
-- nothing to substitute and `evaluatedGuardTruth` has no answer — the
-- question really does fall through to the kernel.
-- (dml-returning-written-case-guard.sql is the shape where it does
-- answer, and there the map wins before the kernel is asked.)
UPDATE t SET active = NOT active
WHERE active
RETURNING
  CASE WHEN active THEN 'a' ELSE name END AS after_flip -- @nullable
