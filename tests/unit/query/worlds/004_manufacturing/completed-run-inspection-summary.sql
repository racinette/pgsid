-- Completion evidence is established inside the CTE, then re-exported beside
-- aggregates that distinguish a run with no inspections from one with them.
-- @params none
-- @null-groups none
-- @param-rejections none
WITH completed_runs AS (
  SELECT
    r.id,
    r.produced_qty,
    r.finished_at
  FROM production_runs r
  WHERE r.state = 'completed'
)
SELECT
  c.id,                -- @notNull
  c.produced_qty,      -- @notNull
  c.finished_at,       -- @notNull
  count(i.id),         -- @notNull
  max(i.inspected_at)  -- @nullable
FROM completed_runs c
LEFT JOIN inspections i ON i.run_id = c.id
GROUP BY c.id, c.produced_qty, c.finished_at
