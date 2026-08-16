-- Mechanism E in the corpus (docs/argument-nullability.md): the enforced
-- CHECK `seats <= 1 OR overflow_contact IS NOT NULL` is grounded with the
-- row's own written values — `5 <= 1` folds FALSE — which leaves
-- `$1 IS NOT NULL` as the entire remaining constraint, so binding NULL is
-- rejected by the CHECK. The sibling CASE constraint is satisfied by the
-- same values ('team' with seats above 1), so the all-valid control writes
-- the row and the raise is about the binding alone.
--
-- This fixture could not exist before the witness classification landed
-- (2026-08-16): the rejection reads "violates check constraint", which no
-- NULL-rejection message matches, so its notNull claim had no witness the
-- soundness suite would accept.
-- @args ["ops@example.com"]
-- @param 1 notNull
INSERT INTO subscription (plan, seats, overflow_contact)
VALUES ('team', 5, $1)
RETURNING
  subscription.plan AS r_plan -- @notNull
