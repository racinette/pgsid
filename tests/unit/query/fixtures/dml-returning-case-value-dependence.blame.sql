-- BLAME FILE for `dml-returning-case-value-dependence` in
-- tests/unit/query/generated/generated-soundness.test.ts (the case/r_ce
-- bucket). See body-parameter-by-name-is-untyped.blame.sql for what a blame
-- file is.
--
-- The mechanism: written-value tracking carries NON-NULLNESS out of an INSERT's
-- VALUES row and no further. `active` was written as the literal `true`, so the
-- tracking knows it is not NULL — `written` claims notNull off that alone. It
-- does not know the value is TRUE, so the CASE's ELSE branch stays reachable to
-- the walk and `over_written` reads nullable through `name`, which was written
-- NULL. PostgreSQL never runs that branch, which is exactly why no data
-- witnesses the claim.
--
-- `written` flipping to nullable would mean the tracking stopped carrying
-- non-nullness at all, and the reason's contrast — non-nullness yes, value no —
-- would have lost its first half. `over_written` flipping to notNull would mean
-- the tracking learned values, and the bucket closes.
-- @unwitnessable 1: `active` was written TRUE, so PostgreSQL never runs the
--   ELSE branch and no row carries the NULL `name` it would return. The claim
--   the rule excuses, executed.
INSERT INTO t (id, name, active) VALUES (1, NULL, true)
RETURNING
  active                                AS written,       -- @notNull
  CASE WHEN active THEN 'a' ELSE name END AS over_written  -- @nullable
