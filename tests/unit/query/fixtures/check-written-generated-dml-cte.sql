-- @null-groups none
-- @param-rejections none
-- The inner UPDATE proves its generated RETURNING column always NULL, and the
-- modifying CTE re-exports that contract positionally.
WITH changed AS (
  UPDATE written_state
  SET state = 'empty'
  WHERE id = 2
  RETURNING display_value
)
SELECT
  display_value -- @alwaysNull
FROM changed
