-- @null-groups none
-- @param-rejections none
UPDATE written_numeric SET state = 9007199254740993.4 WHERE id = 1
RETURNING
  amount -- @alwaysNull
