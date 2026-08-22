-- The guard channel running the PRESENCE FIXPOINT rather than copying its
-- rules (`guardedPresence` / `withSpeculativeScope`), landed 2026-08-22.
--
-- Three rungs before this one — guardsImplyNotNull, guardsPromoteAlias,
-- findNullGroupPromoter — copied one fixpoint rule each. The rule they could
-- not copy is not a predicate test but the fixpoint's LOOP: presence
-- activates a join, the join's qual becomes an implied qual of the scope,
-- that qual proves another relation present, and that activates the next
-- join. `t.active` reaches `u.email` only by going all the way round it.
--
-- `implied_qual` and `dissolution` are the same route in the two nestings,
-- (t k u) k v and t k (u k v). They are NOT two mechanisms: the second one's
-- trace shows the participation closure's dissolveUnit promoting u2 first,
-- but suppressing dissolution under speculation changes no verdict in any of
-- the 32 nestings — activation gets there a beat later. An earlier version
-- of this file claimed the split; the mutation disproved it. Both columns
-- stay because the promotion ORDER differs, so a dissolution that misbehaves
-- under speculation is exercised here and nowhere else.
--
-- `else_arm` is the not-taken channel, and it is the one column here with a
-- mechanism of its own. A guard that is not TRUE is FALSE *or NULL*, which
-- is no predicate at all — but `IS NULL` is total, so reaching the ELSE
-- proves it was FALSE, and `guardPredicates` flips the polarity to hand the
-- fixpoint a real conjunct (`t.id IS NOT NULL`). Dropping the flip leaves
-- `taken_arm` — same shape, same aliases, guard taken — notNull and this one
-- nullable, which is what makes the pair discriminating.
--
-- `no_route` is the control that matters: the SAME guard on the SAME two
-- tables over `t LEFT JOIN u`, where the evidence genuinely does not reach
-- `u`. `t` is the preserved side, so proving it present says nothing new;
-- the LEFT join activates only once its RIGHT side is present, so no qual is
-- implied; nothing kills u's extension unit, so nothing dissolves. Both
-- routes decline and the column must stay nullable — witnessed by any `t` no
-- `u` points at. A speculative run that promoted aliases its evidence does
-- not reach shows up here first, and only the join structure separates it
-- from `implied_qual`.
--
-- The RESTORE is gated elsewhere and deliberately: `withSpeculativeScope`
-- undoes every fixpoint mutation, and a leak is invisible to any single
-- fixture — it would widen queries with no CASE in them at all. The
-- generated corpus is what holds it: the rung moved notNull by exactly +60,
-- the size of the bucket it targeted, over 14964 executed queries.
SELECT
  CASE WHEN t.active THEN u.email ELSE 'e' END AS implied_qual,      -- @notNull
  CASE WHEN t2.active THEN u2.email ELSE 'e' END AS dissolution,     -- @notNull
  CASE WHEN t.id IS NULL THEN 'e' ELSE u.email END AS else_arm,      -- @notNull
  CASE WHEN t.id IS NOT NULL THEN u.email ELSE 'e' END AS taken_arm, -- @notNull
  CASE WHEN t3.active THEN u3.email ELSE 'e' END AS no_route         -- @nullable
FROM ((t RIGHT JOIN u ON u.t_id = t.id) RIGHT JOIN v ON v.u_id = u.id)
CROSS JOIN (t AS t2 RIGHT JOIN (u AS u2 RIGHT JOIN v AS v2 ON v2.u_id = u2.id) ON u2.t_id = t2.id)
CROSS JOIN (t AS t3 LEFT JOIN u AS u3 ON u3.t_id = t3.id)
