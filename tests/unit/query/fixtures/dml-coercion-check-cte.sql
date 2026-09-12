-- @null-groups none
-- @param-rejections none
WITH changed AS (
  UPDATE written_coercion SET state = 'a ' WHERE id = 1
  RETURNING display_value
)
SELECT
  display_value -- @alwaysNull
FROM changed
