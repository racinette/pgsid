-- The fold rule for user-defined aggregates, one column per gate.
--
-- A builtin aggregate is answered by name from a curated table. A user
-- aggregate has no name worth curating and an analysable body instead: its
-- transition function is an ordinary LANGUAGE sql function whose AST the
-- catalog already parsed. All that was missing was the link recording which
-- aggregate folds through which function.
--
-- Over a NON-EMPTY group the result is the fold's output, so it is non-null
-- when three things hold: the state starts non-null (a non-null INITCOND),
-- the transition preserves that, and the final function does too. Each of the
-- four columns below turns exactly one of those, and PostgreSQL returns NULL
-- for the three that fail — a gate that stops working is falsified here, not
-- merely unannotated.
--
-- GROUP BY p.id makes every group one row, which is enough: the induction is
-- per step, so one step exercises it.
SELECT
  p.id                             AS product_id,   -- @notNull

  -- All three gates hold: INITCOND '0', `SELECT state + 1` preserves a
  -- non-null state, and no FINALFUNC to undo it.
  count_it(p.id)                   AS folds,        -- @notNull

  -- The INITCOND gate. Same non-null-preserving `state + 1` transition, but
  -- no INITCOND — and the transition is STRICT, so PostgreSQL skips the NULL
  -- input rather than calling it, nothing transitions, and the NULL initial
  -- state is the answer. `category_id` is NULL on at least one product.
  agg_strict_noinit(p.category_id) AS no_initcond,  -- @nullable

  -- The transition gate. INITCOND '0' starts the state non-null and
  -- `nullify_sfunc` throws it away on the first row.
  agg_nullify(p.id)                AS trans_nulls,  -- @nullable

  -- The final-function gate, and the only column where the first two gates
  -- both pass: agg_finalnull folds through count_it's own transition and then
  -- hands the accumulated state to `final_null`.
  agg_finalnull(p.id)              AS final_nulls,  -- @nullable

  -- The hypothesis gate. The transition is walked with the state assumed
  -- non-null and the value argument assumed NULL, which is the weakest
  -- assumption the induction closes under. `state + val` needs more than
  -- that, so the rule refuses — and a group holding a NULL value proves it
  -- was right to.
  agg_sum_step(p.category_id)      AS reads_value,  -- @nullable

  -- The overloaded-name gate. `amb_sfunc` has two bodies that disagree, and
  -- this aggregate declares the one returning NULL — so reaching for the
  -- other BY NAME would claim notNull where PostgreSQL answers NULL, which
  -- is what this column catches however the mistake might arise.
  --
  -- What refuses it is not a comparison but the lookup itself: the fold rule
  -- reaches a body through a NAME-keyed resolver that takes no argument types
  -- and so declines every overloaded name outright (measured — it declines
  -- with the adapter's body-map guards lifted too). The catalog records the
  -- exact signature; nothing on the way to the body can consume it. So an
  -- aggregate with an overloaded transition is refused whichever overload it
  -- declares, conservatively and by construction.
  agg_ambiguous(p.id)              AS ambiguous_sfunc -- @nullable
FROM products p
GROUP BY p.id
