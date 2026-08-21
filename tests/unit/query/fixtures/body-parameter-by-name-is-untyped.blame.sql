-- BLAME FILE for `body-parameter-by-name-is-untyped` in
-- tests/unit/query/generated/generated-soundness.test.ts (the fn-call/a_fi
-- bucket). A blame file is a rule's REASON, executable: the rule excuses a
-- nullable claim nothing witnesses, and this pins the mechanism it blames.
-- If either column flips, the reason is describing a world that no longer
-- exists — and the claim it excuses can stay unwitnessed while that happens,
-- which is why the rule's own gate cannot see it.
--
-- The mechanism: typed dispatch resolves a builtin call by its argument's
-- type and reads the signature-keyed verdict, which is how `upper` claims
-- totality over text while its `(anyrange)` row stays nullable
-- (builtin-lower-upper-text.sql, builtin-range-lower-upper.sql). Inside a
-- LANGUAGE sql body it reaches `$n` — the body context carries the declared
-- argument types and `$n` reads them (body-builtin-parameter-type.sql). It
-- does NOT reach the parameter's NAME: `renderedTypeOfExpr` resolves a
-- ColumnRef only through scope relations, and a body with no FROM has an
-- empty scope, so the type comes back unknown and the walk falls through to
-- the name-level tables where `upper` correctly is not.
--
-- `via_dollar` flipping to nullable would mean typed dispatch stopped
-- reaching bodies at all. `via_name` flipping to notNull would mean the
-- asymmetry closed — and the a_fi bucket with it, so the rule goes stale and
-- this file retires alongside it.
-- @unwitnessable 1: `upper` of a non-null text is always non-null, so no data
--   reaches this NULL — which is the claim the rule excuses, executed here
--   rather than described. A blame file's nullable column is unwitnessable by
--   construction; that is what makes it the reason.
SELECT
  body_upper('a') AS via_dollar,  -- @notNull   `SELECT UPPER($1)`
  gfn_io('a')     AS via_name     -- @nullable  `SELECT upper(a)`
