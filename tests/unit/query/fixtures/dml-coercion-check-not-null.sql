-- @null-groups none
-- @param-rejections none
UPDATE written_coercion
SET state = 'b '
WHERE id = 2
RETURNING
  amount, -- @notNull
  display_value, -- @notNull
  CASE WHEN amount IS NOT NULL THEN 'yes' ELSE NULL END AS selected -- @notNull
