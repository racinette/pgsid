-- DELETE supplies a data-modifying CTE whose RETURNING contract is re-exported
-- by the outer query. NULL filters merely select no row, so both bindings stay
-- independently nullable.
-- @args [2, "collected"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
WITH removed AS (
  DELETE FROM lab_samples
  WHERE id = $1 AND state = $2
  RETURNING id, test_name, result_display
)
SELECT
  r.id,              -- @notNull
  r.test_name,       -- @notNull
  r.result_display   -- @nullable
FROM removed r
