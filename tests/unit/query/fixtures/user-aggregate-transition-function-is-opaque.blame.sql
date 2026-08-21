-- BLAME FILE for `user-aggregate-transition-function-is-opaque` in
-- tests/unit/query/generated/generated-soundness.test.ts (the
-- fn-agg-window/a_fa bucket). See body-parameter-by-name-is-untyped.blame.sql
-- for what a blame file is.
--
-- The mechanism: NON_NULL_OVER_NONEMPTY_AGGREGATES is a curated set of
-- BUILTIN names, and GROUP BY yields no empty group, so an aggregate in that
-- set over non-null input is non-null. A USER aggregate's transition function
-- is opaque to it — `gfn_noinit` has no INITCOND, and nothing tells the walk
-- that `gfn_sfunc` never returns NULL over non-empty input (it can: its body
-- folds all-NULL input to NULL, deliberately, so the claim has a witness
-- somewhere).
--
-- `builtin_agg` flipping to nullable would mean the non-empty-group gate
-- stopped working, and the reason would be blaming user-ness for something
-- that no longer holds for builtins either. `user_agg` flipping to notNull
-- would mean the walk learned to read a user sfunc, and the bucket closes.
-- @unwitnessable 1: GROUP BY yields no empty group and tags.name is NOT NULL,
--   so gfn_sfunc never sees the all-NULL input its body folds to NULL. The
--   claim the rule excuses, executed.
SELECT
  count(tg.name)      AS builtin_agg,  -- @notNull   curated, non-empty group
  gfn_noinit(tg.name) AS user_agg      -- @nullable  sfunc opaque
FROM tags tg
GROUP BY tg.id
