-- A RETURNING CASE guard is answered from the values the statement WROTE
-- (`written-value-guards.ts`), landed 2026-08-22. This file was
-- `dml-returning-case-value-dependence.blame.sql` until then, and its own
-- text named the flip that retired it: "`over_written` flipping to notNull
-- would mean the tracking learned values, and the bucket closes."
--
-- The walk already prunes CASE arms and already prunes them from exactly this
-- kind of fact — `evaluatedGuardTruth` reads the statement evaluation map, a
-- TRUE guard kills every later arm and the ELSE with it. What it could not do
-- is ASK: the evaluator is scope-blind by construction, any node carrying a
-- name is open, and `active` is a name. So the pass closes the tree instead
-- of teaching the evaluator to resolve — substitute the written constant for
-- the column, hand the result to the same evaluator core, key the answer back
-- to the ORIGINAL guard node. The consumer side needed no change at all.
--
--   still_written  the ORIGINAL claim, unchanged: `active` was written a
--                  non-NULL value. If this ever goes nullable the tracking
--                  stopped carrying non-nullness, which is the half that was
--                  always there.
--   bare_true      THE CLAIM, and the shape the generated corpus's whole
--                  r_ce bucket was made of. The guard reduces to a bare
--                  A_Const, which the evaluator collects nothing from — a
--                  literal is closed but there is nothing to compute — so the
--                  pass reads the parser's own decoded payload instead.
--   bare_false     the same path, opposite polarity: the guard is FALSE, the
--                  ELSE runs, and `name` was written NULL. It read @nullable
--                  until 2026-08-25, when `alwaysNullExpr`'s CASE rule
--                  started consulting the SAME arm pruning the notNull rule
--                  uses — the arm cannot fire, so its non-null `'a'` stops
--                  standing in the way of the ELSE's NULL. PostgreSQL
--                  returns NULL for it (adjudicated; the statement writes one
--                  deterministic row).
--   eval_hit       the EVALUATED path — `val = 'paid'` over a written 'paid'
--                  is not a literal, it is a comparison PostgreSQL answers.
--                  This is what makes the mechanism general rather than a
--                  boolean special case, and it is dark if only the bare
--                  path exists.
--   eval_miss      the same comparison against the other literal: FALSE, so
--                  the ELSE runs and the NULL `name` comes back — @alwaysNull
--                  by the same 2026-08-25 pruning, through the EVALUATED
--                  guard rather than the bare one.
--
-- The two `eval_` columns are why the corpus needed its `evaluate` callback
-- turned on as part of this change: without one the pass returns nothing and
-- both read nullable, which is how the bucket survived a capable engine.
INSERT INTO t (id, name, val, active) VALUES (1, NULL, 'paid', true)
RETURNING
  active                                        AS still_written, -- @notNull
  CASE WHEN active      THEN 'a' ELSE name END  AS bare_true,     -- @notNull
  CASE WHEN NOT active  THEN 'a' ELSE name END  AS bare_false,    -- @alwaysNull
  CASE WHEN val = 'paid'  THEN 'a' ELSE name END AS eval_hit,     -- @notNull
  CASE WHEN val = 'draft' THEN 'a' ELSE name END AS eval_miss     -- @alwaysNull
