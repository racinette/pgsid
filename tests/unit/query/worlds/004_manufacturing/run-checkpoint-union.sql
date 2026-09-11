-- Running and completed runs ask for different checkpoints. Each branch keeps
-- its optional inspection as one row unit, and UNION ALL must preserve the
-- group on the shared output positions.
-- @params none
-- @null-group 2*,3,4
-- @param-rejections none
SELECT
  r.run_code,                    -- @notNull
  'in_process'::text,            -- @notNull
  i.id,                          -- @nullable
  i.inspector,                   -- @nullable
  i.outcome                      -- @nullable
FROM production_runs r
LEFT JOIN inspections i
  ON i.run_id = r.id
 AND i.inspection_kind = 'in_process'
 AND i.status = 'completed'
WHERE r.state = 'running'
UNION ALL
SELECT
  r.run_code,
  'final'::text,
  i.id,
  i.inspector,
  i.outcome
FROM production_runs r
LEFT JOIN inspections i
  ON i.run_id = r.id
 AND i.inspection_kind = 'final'
 AND i.status = 'completed'
WHERE r.state = 'completed'
