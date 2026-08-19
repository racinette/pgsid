-- The slice-local participation imprecision, flat form — found by the
-- generated EXPLAIN oracle (436 cases, one root cause; deferred-tasks §4).
--
-- The RIGHT JOIN's strict qual `v.u_id = u.id` references `u`, which the
-- LEFT JOIN nested in its left arm extends. A u-extended row makes the qual
-- NULL, and the RIGHT JOIN drops unmatched left rows — so the LEFT's
-- extension never survives to the output, and the planner reduces it to
-- INNER. The fixpoint cannot: it implies a qual only from GLOBAL presence,
-- and under the RIGHT JOIN's own extension nothing is globally present.
-- PARTICIPATION would suffice — the qual held on every row where the left
-- arm participates, which is exactly where the nested extension could
-- matter.
--
-- Soundness is unaffected either way: every claimed-nullable column here is
-- genuinely nullable via the RIGHT JOIN's extension (a v row matching no u
-- returns t.id and u.email NULL together). The imprecision is join
-- accounting alone, which is why it lives as a @planner-reduces annotation
-- and not as a wrong claim. When the participation closure lands, the
-- annotation goes stale and fails — that is its purpose.
--
-- @planner-reduces 1: the RIGHT JOIN's strict qual settles the LEFT nested
--   in its participating arm; the fixpoint gates qual implication on global
--   presence where participation suffices (the slice-local imprecision,
--   deferred-tasks §4 — this annotation is the closure's tripwire).
SELECT
  t.id     AS tid,   -- @nullable
  u.email  AS uem,   -- @nullable
  v.amount AS vam    -- @nullable
FROM t
LEFT JOIN u ON u.t_id = t.id
RIGHT JOIN v ON v.u_id = u.id
