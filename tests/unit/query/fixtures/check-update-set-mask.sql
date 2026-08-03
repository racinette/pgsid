-- The DML SET mask over CHECK entailment, pinned by a live counterexample —
-- the CHECK analogue of update-set-mask.sql, with the twist that entailment
-- consumes evidence about columns OTHER than the one it resolves: the WHERE
-- proved the OLD row's status 'housed', the statement then moves the row to
-- an arm whose CHECK forces arrived_at NULL. Without dropping conjuncts that
-- reference SET columns, the kernel would combine an OLD-row discriminator
-- with a NEW-row CHECK and claim tv notNull — and this statement's own rows
-- would falsify it.
--
-- room is the mask's cost, recorded rather than papered over: every returned
-- room IS non-null (the OLD row was housed, so its CHECK forced room non-null,
-- and room is not SET), but deriving that needs OLD-row entailment for a
-- non-SET goal column, and the mask is uniform. Imprecise, never wrong.
-- @unwitnessable 1: the OLD rows' own CHECK forces room non-null and room is
-- not SET, so no returned row can carry a NULL; the uniform SET mask just
-- cannot see it. Engine imprecision, recorded in the register.
UPDATE guest
SET arrived_at = NULL, status = 'in-flight'
WHERE status = 'housed'
RETURNING
  arrived_at AS tv,   -- @nullable
  room,               -- @nullable
  id                  -- @notNull
