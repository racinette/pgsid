-- Both filters promote the nullable progress value while leaving completion
-- time and notes dependent on the run state.
-- @args ["GEAR-40", 0]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  r.run_code,      -- @notNull
  r.produced_qty,  -- @notNull
  r.finished_at,   -- @nullable
  r.notes          -- @nullable
FROM production_runs r
WHERE r.product_code = $1
  AND r.produced_qty >= $2
