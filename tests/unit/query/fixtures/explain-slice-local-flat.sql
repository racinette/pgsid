-- The participation closure, flat form — the positive pin. Found as an
-- imprecision by the generated EXPLAIN oracle (436 cases, one cause),
-- closed in the fixpoint (docs/nullability-walk.md, "The participation
-- closure"; the class is pinned at 0 in generated-explain.test.ts).
--
-- The RIGHT JOIN's strict qual `v.u_id = u.id` references `u`, which the
-- LEFT JOIN nested in its left arm extends. A u-extended row makes the
-- qual NULL — never TRUE — and a RIGHT JOIN drops unmatched left rows, so
-- the LEFT's own extension never reaches the output. The closure dissolves
-- u's unit into the arm's: `u` rides with `t` now, NULL exactly when the
-- RIGHT JOIN null-extends the whole left arm. The planner concludes the
-- same by reduce_outer_joins (the plan keeps one outer join, and so does
-- the walk — no @planner-reduces here anymore, which is the point).
--
-- The contract-surface gain is the GROUP: before the closure `t` and `u`
-- sat in separate single-member units and no group was emitted; now tid
-- and uem go NULL together exactly when the arm is absent — a v row
-- matching no u — and both are discriminants (NOT NULL given presence).
-- @null-group 0*,1*
SELECT
  t.id     AS tid,   -- @nullable
  u.email  AS uem,   -- @nullable
  v.amount AS vam    -- @nullable
FROM t
LEFT JOIN u ON u.t_id = t.id
RIGHT JOIN v ON v.u_id = u.id
