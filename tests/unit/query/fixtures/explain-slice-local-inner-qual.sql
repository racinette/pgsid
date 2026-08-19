-- The participation closure where the qual-bearer is an INNER join —
-- pinned separately from the flat form because a closure written only for
-- outer-join quals would pass that fixture and miss this one
-- (deferred-tasks §4).
--
-- The INNER join's strict qual `v.u_id = u.id` settles the LEFT above it:
-- a u-extended row fails the qual and the INNER join drops it. At top
-- level the fixpoint always knew this (the qual is implied globally);
-- under the RIGHT JOIN's extension nothing is globally present, and the
-- closure's participation reading is what reaches it — the qual held on
-- every row where the arm participates, which is the only place the
-- nested extension could matter. Same conclusion as the planner's
-- reduce_outer_joins; the plan and the walk both keep one outer join.
--
-- With u's unit dissolved, all three arm relations ride the RIGHT JOIN's
-- unit together: tid, uem, and vid go NULL together exactly when the arm
-- is absent — a ck row no v matches — and all three are discriminants.
-- `ck` is the preserved side, so its NOT NULL `val` keeps its catalog
-- claim.
-- @null-group 0*,1*,2*
SELECT
  t.id    AS tid,   -- @nullable
  u.email AS uem,   -- @nullable
  v.id    AS vid,   -- @nullable
  ck.val  AS ckv    -- @notNull
FROM t
LEFT JOIN u ON u.t_id = t.id
JOIN v ON v.u_id = u.id
RIGHT JOIN ck ON ck.id = v.id
