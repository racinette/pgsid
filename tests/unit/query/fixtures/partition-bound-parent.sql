-- Partition bounds never leak to a parent scan (docs/subtree-evaluation.md,
-- the refused direction, corpus-witnessed): the same guard the direct
-- order_events_early scan refutes fires HERE, because a scan naming the
-- parent reads every partition and only the union holds — the late
-- partition's rows (ids 150+, deterministic ctx.row + 150) witness the
-- NULL in every data state. The refusal is structural: a partitioned ROOT
-- renders no bound at all (pinned in param-mechanism), so there is no
-- fact to misread.
SELECT
  CASE WHEN t.id >= 150 THEN NULL ELSE 5 END AS no_leak -- @nullable
FROM order_events t
