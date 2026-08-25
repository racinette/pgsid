-- A biconditional CHECK read through a generated column, working side.
-- `status = 'started'` makes the pending disjunct's `status = 'pending'`
-- FALSE by literal distinctness, the OR descends to its survivor, and
-- that conjunct carries `started_at IS NOT NULL` onto every returned
-- row. `event_duration` is declared NOT NULL, so the generation
-- expression's strict `+` has two pinned operands.
--
-- The chain is the same one check-generated-predicate-chain.sql walks,
-- with the arm selection done by the CHECK's own disjunction instead of
-- by a CASE — which is why both exist.
SELECT
  projected -- @notNull
FROM evb
WHERE status = 'started'
