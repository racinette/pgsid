-- The atom-oracle rungs' crafted conviction (crafted
-- fixtures convict beside the generated distribution, under this corpus's
-- own gates — the shape argued real in the header, every claim
-- adjudicated). A defensive CASE over a CHECK-constrained column is as
-- natural as SQL gets: CHECK (a > 5) is notFALSE per stored row, so
-- `a <= 5` is never TRUE — same-token trichotomy, no values consulted —
-- and the NULL arm never fires. A NULL `a` passes the CHECK and still
-- answers 5 (UNKNOWN guard falls through), so the claim survives the
-- NULL-carrying row the data states include.
SELECT
  CASE WHEN a <= 5 THEN NULL ELSE 5 END AS a2,  -- @notNull
  -- The control: `a >= 7` is NOT exclusive with the CHECK's `a > 5`
  -- (a = 8 satisfies both), so no refutation exists and the NULL arm
  -- fires on real rows — witnessed.
  CASE WHEN a >= 7 THEN NULL ELSE 5 END AS a3   -- @nullable
FROM tri
