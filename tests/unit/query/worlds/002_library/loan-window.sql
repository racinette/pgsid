-- @args ["2024-01-01", "2024-03-31"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  l.id,          -- @notNull
  l.due_on,      -- @notNull
  l.returned_on  -- @nullable
FROM loans l
WHERE l.checked_out_on >= $1
  AND l.due_on <= $2
