-- @null-groups none
-- @param-rejections none
UPDATE written_coercion
SET state = 'a '
WHERE id = 1
RETURNING
  amount, -- @alwaysNull
  display_value, -- @alwaysNull
  CASE WHEN amount IS NULL THEN 'yes' ELSE NULL END AS selected -- @notNull
