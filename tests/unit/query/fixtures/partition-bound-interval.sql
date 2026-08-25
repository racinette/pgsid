-- Partition-bound facts.
-- The everyday shape: a query pinned to one partition of an event log —
-- an archival job, a per-range backfill — where the bound is the only
-- thing standing between the guard and the NULL arm. order_events_early
-- is [0, 100): its rendered bound holds TRUE per stored row (routing,
-- direct-insert rejection and ATTACH validation, pinned in
-- param-mechanism), so the interval machinery refutes every guard set
-- disjoint from [0, 100) — the adjacent ray included, sharing only the
-- bound's own anchor. The overlap guard keeps the boundary: [50, inf)
-- reaches [50, 100), and the generator's first row (id = 50,
-- deterministic ctx.row + 50) fires the arm in every data state.
SELECT
  CASE WHEN t.id >= 150 THEN NULL ELSE 5 END AS ray_gap,       -- @notNull
  CASE WHEN t.id >= 100 THEN NULL ELSE 5 END AS ray_adjacent,  -- @notNull
  CASE WHEN t.id < 0    THEN NULL ELSE 5 END AS below_lower,   -- @notNull
  CASE WHEN t.id = 200  THEN NULL ELSE 5 END AS point_outside, -- @notNull
  CASE WHEN t.id >= 50  THEN NULL ELSE 5 END AS overlap_kept   -- @nullable
FROM order_events_early t
