-- The slice-local participation imprecision where the qual-bearer is an
-- INNER join — the variant the generated corpus surfaced after the flat
-- form (deferred-tasks §4), pinned separately because a closure written
-- only for outer-join quals would pass the flat fixture and miss this one.
--
-- The INNER join's strict qual `v.u_id = u.id` settles the LEFT above it:
-- a u-extended row fails the qual and the INNER join drops it. At top
-- level the fixpoint handles exactly this (the qual is implied globally);
-- here the whole chain sits under the RIGHT JOIN's extension, so nothing
-- is globally present and the implication never fires — same participation
-- rule, different qual owner. The planner reduces the LEFT to INNER and
-- keeps one outer join; the walk counts two.
--
-- `ck` is the RIGHT JOIN's preserved side, so its NOT NULL `val` keeps its
-- catalog claim — the row that is present is a real ck row.
--
-- `t` and `v` sit in the RIGHT JOIN's arm unit (`u` keeps the inner LEFT's
-- deeper one), so tid and vid go NULL together exactly when the arm is
-- absent — a ck row no v matches.
-- @null-group 0*,2*
--
-- @planner-reduces 1: the INNER join's strict qual settles the LEFT nested
--   in the arm, under an enclosing extension that blocks the fixpoint's
--   global-presence gate (the slice-local imprecision, deferred-tasks §4 —
--   the qual-bearer need not be an outer join).
SELECT
  t.id    AS tid,   -- @nullable
  u.email AS uem,   -- @nullable
  v.id    AS vid,   -- @nullable
  ck.val  AS ckv    -- @notNull
FROM t
LEFT JOIN u ON u.t_id = t.id
JOIN v ON v.u_id = u.id
RIGHT JOIN ck ON ck.id = v.id
