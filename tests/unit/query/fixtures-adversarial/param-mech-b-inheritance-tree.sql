-- FINDING 8 (rank 3, conditional) — mechanism B reads the named relation's
-- attnotnull while an UPDATE/DELETE/MERGE target scans the TREE. RC-3 moved
-- the output side to `notNullTree` and the hook gate to
-- `resolveWriteRewritesTree`; `columnRejection` still calls
-- `resolveColumnNotNull` (the relation's own flag). `ALTER TABLE ONLY
-- pnn_p … SET NOT NULL` leaves the child unconstrained, so a child-stored
-- row takes the NULL.
--
-- Measured, both states:
--   child row  (INSERT INTO pnn_c …) → ACCEPTED, returns [1]
--   parent row (INSERT INTO pnn_p …) → RAISES not-null violation
--
-- CONDITIONAL because `notNull` is EXISTENTIAL (docs/argument-nullability.md):
-- the parent-row state is an execution in which the NULL binding raises, so
-- the claim survives its own semantics — but it is unwitnessable in every
-- child-only state and the contract gives the consumer no way to know it.
-- Composed with finding 2 it becomes unconditional: a `CHECK (false)
-- NO INHERIT` on the parent makes a parent-stored row impossible, and then
-- NO execution raises. Recorded here as the asymmetry it is —
-- `resolveColumnNotNullTree` exists and this site does not use it.
-- @args [null]
-- @param 1 notNull  <-- accepted in the child-only state
UPDATE pnn_p SET a = $1 WHERE id = 1
RETURNING
  id  -- @notNull
