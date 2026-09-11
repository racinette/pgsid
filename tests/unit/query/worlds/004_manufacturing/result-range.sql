-- The range predicate supplies a measurement, so the generated verdict cannot
-- take its NULL arm even though either stored limit remains optional.
-- @args ["temperature", 18, 25]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  r.id,              -- @notNull
  r.measured_value,  -- @notNull
  r.lower_limit,     -- @nullable
  r.upper_limit,     -- @nullable
  r.verdict          -- @notNull
FROM inspection_results r
WHERE r.metric_name = $1
  AND r.measured_value BETWEEN $2 AND $3
