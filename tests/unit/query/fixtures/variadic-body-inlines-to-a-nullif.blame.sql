-- BLAME FILE for `variadic-body-inlines-to-a-nullif` in
-- tests/unit/query/generated/generated-soundness.test.ts (the fn-call/a_fv
-- bucket). See body-parameter-by-name-is-untyped.blame.sql for what a blame
-- file is.
--
-- The rule used to blame `resolveFunctionCandidates` refusing to arity-filter
-- against a VARIADIC candidate. Measured: the refusal is not on this path at
-- all. `gfn_var` resolves to a single catalog candidate, so `meta` is found,
-- the consensus branch (which is the one that asks for candidates) is never
-- entered, and the call takes priority 5 — LANGUAGE sql body recursion. The
-- body is `SELECT nullif(array_to_string(xs, ','), '')`, and `nullif` is
-- nullable by construction; the schema comment on gfn_var says so outright,
-- because a total body would leave the claim with no witness anywhere.
--
-- So VARIADIC costs nothing here, and lifting the refusal would not move this
-- claim. `variadic` flipping to notNull would mean the body's `nullif` stopped
-- being read as nullable. `defaulted` flipping to nullable would mean body
-- recursion stopped reaching user functions, which is the half the reason
-- actually depends on.
-- @unwitnessable 0: array_to_string ignores NULL arguments, so the body's
--   nullif fires only when EVERY argument is NULL — and a single literal
--   argument is not. The claim the rule excuses, executed.
SELECT
  gfn_var('a') AS variadic,   -- @nullable  body is a nullif
  gfn_def(1)   AS defaulted   -- @notNull   body is `SELECT a + b`, inlined
