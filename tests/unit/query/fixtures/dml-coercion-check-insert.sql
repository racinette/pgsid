-- @null-groups none
-- @param-rejections none
INSERT INTO written_coercion (id, state) VALUES (9001, 'a ')
RETURNING
  amount, -- @alwaysNull
  display_value -- @alwaysNull
