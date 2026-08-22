-- The two promotion rungs that closed 36 of the a_case bucket on
-- 2026-08-22, pinned as a mechanism rather than as a claim count.
--
-- Both are needed for `both_rungs`, and each is dark on its own:
--   1. `predicateProvesNonNull` enumerated BoolExpr / NullTest / A_Expr and
--      then returned false, so a predicate that IS a ColumnRef — a boolean
--      column steering a row or a branch — proved nothing about itself.
--   2. `findNullGroupPromoter` asked `checkWhereAliasPromoted` and nothing
--      else, so a branch guard could promote `t` and the promotion had no
--      way to reach `u`. The per-alias rung one level up had always asked
--      both channels; only the group hop was single-channel.
--
-- Why a fixture at all, when the generated corpus moved 36 claims: mutating
-- either rung is caught ONLY by that corpus's "every unwitnessed nullable
-- claim is witnessed or classified" gate, which sees an outcome, not a
-- mechanism. It fires because CASE_DARK_STRUCTURES was trimmed to the five
-- structures that survive; re-widen that set for any reason and both rungs
-- go dark with nothing failing. This fixture does not depend on the set.
--
-- `guard_only` isolates rung 2: the guard tests u's OWN column, so the
-- per-alias rung promotes `u` directly and no group hop is involved — it
-- holds when rung 2 is mutated away and `both_rungs` does not, which is
-- what makes the pair discriminating rather than redundant. (The same
-- ColumnRef gap also lived in the WHERE channel, `WHERE t.active`; it is
-- not pinned here because a statement-wide WHERE would promote `t` for
-- every column and mask the very rung the other two are testing.)
-- `cross_unit` is the control: t and u sit in DIFFERENT
-- null-extension units under (t RIGHT u) RIGHT v, the guard channel has no
-- cross-unit promotion, and it must stay nullable. If it ever flips, that
-- is the open item closing and this comment is what to read first.
-- @unwitnessable 2: a_case is NULL only where t is present with active TRUE
--   and u NULL-extended, and (t RIGHT u) RIGHT v produces no such row — the
--   inner RIGHT preserves u, so a u-absent row extends the whole composite
--   and takes the ELSE arm. The claim is engine imprecision, not truth: the
--   WHERE channel reads notNull on this exact shape, which is the measured
--   evidence that only the guard channel's cross-unit hop is missing. See
--   the register's item 3.
SELECT
  CASE WHEN t.active THEN u.email ELSE 'e' END AS both_rungs,  -- @notNull
  CASE WHEN u.id > 0 THEN u.email ELSE 'e' END AS guard_only,  -- @notNull
  CASE WHEN t2.active THEN u2.email ELSE 'e' END AS cross_unit -- @nullable
FROM (t JOIN u ON u.t_id = t.id) RIGHT JOIN v ON v.u_id = u.id
CROSS JOIN ((t AS t2 RIGHT JOIN u AS u2 ON u2.t_id = t2.id) RIGHT JOIN v AS v2 ON v2.u_id = u2.id)
