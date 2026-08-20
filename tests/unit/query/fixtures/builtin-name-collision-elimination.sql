-- A user function colliding with a builtin BY NAME ONLY costs the builtin
-- nothing — and after the execution admission, nothing at all.
--
-- `public.scale(boolean)` and `public.length(boolean)` live in the shared
-- schema (see its tail). They have nothing to do with numerics or text, and
-- PostgreSQL eliminates them by argument type under any search path. Before the
-- function overload merge (docs/function-overload-merge.md) their mere
-- EXISTENCE was enough to collapse both names: the subtree evaluator refused
-- any subtree using a name `evalUserFunctionNames` carried, whatever its arity,
-- so `scale(8.41)` — a closed literal with no user involvement at all — stopped
-- folding and read nullable. The refusal is decided by SURVIVAL now.
--
-- The last column is the interesting one. A BARE `unknown` literal reaches
-- every candidate, including the user's `length(boolean)`, so the survivor set
-- stays mixed and no SYMBOLIC verdict is available — separating them needs
-- PostgreSQL's preferred-type rule, which docs/type-aware-overloads.md declares
-- a non-goal ("No tiebreak algorithm"). It was the merge's one priced cost, and
-- it was refunded rather than paid: once IMMUTABLE user functions are
-- admitted to execution, the evaluator hands the whole expression to
-- PostgreSQL, which applies its own resolution and answers with a value.
-- Delegating beat reimplementing, and the non-goal stays a non-goal.
--
-- The collision is deliberately in the SHARED schema rather than a private one:
-- six other fixtures call `length` or `scale`, so the elimination is exercised
-- by the corpus rather than by the one case that agrees with it.
--
-- `pg-catalog-shadowed-function.sql` pins the neighbouring question — an
-- IDENTICAL-signature shadow, where elimination cannot separate the rows and
-- consensus over both decides instead.
SELECT
  scale(8.41)             AS folded,     -- @notNull   (survivor is scale(numeric))
  length('abc'::text)     AS cast_arg,   -- @notNull   (the cast eliminates the user row)
  length('abc')           AS bare_arg,   -- @notNull   (PostgreSQL resolves it in the fold)
  length(p.sku)           AS typed_col   -- @notNull   (a text column narrows it)
FROM products p
