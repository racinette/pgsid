-- A VARIADIC user function is RESOLVED and its body INLINED, like any other
-- single-candidate call — the correction of a belief that stood in three
-- places at once (this schema's comment on gfn_var, the generated corpus's
-- UNWITNESSABLE rule for a_fv, and the register) until it was measured
-- 2026-08-22.
--
-- What all three said: `resolveFunctionCandidates` refuses to arity-filter
-- against a VARIADIC candidate, so the call is conservatively nullable. What
-- the trace says: `catalogMeta = public.gfn_var`, `priority = 5 (LANGUAGE sql
-- body recursion)`. The refusal lives on the CONSENSUS branch, which is
-- reached only when no single candidate resolves — and one does here. So
-- VARIADIC costs this call nothing, and lifting the refusal would move no
-- claim.
--
-- What makes it nullable is the body: `nullif(array_to_string(xs, ','), '')`.
-- `array_to_string` SKIPS NULL elements rather than propagating them, so the
-- join is '' whenever the surviving elements are — which is why a single
-- empty-string argument reaches the NULL and a single 'a' does not. That is
-- also the second half of the correction: "the nullif fires only when EVERY
-- argument is NULL" was wrong, and the generated corpus witnessed 240 claims
-- the moment a NULL name met an empty email.
-- `gfn_var('a')` is deliberately absent: the walk reads the inlined `nullif`
-- and calls it nullable whatever the argument, which is correct and which no
-- data can witness for a non-empty literal. The empty-string spelling carries
-- the same claim WITH a witness, and a fixture that can be witnessed should
-- be.
SELECT
  gfn_var('') AS folds,      -- @nullable  array_to_string(['']) = '' → NULL
  gfn_def(1)  AS defaulted   -- @notNull   `SELECT a + b`, inlined the same way
