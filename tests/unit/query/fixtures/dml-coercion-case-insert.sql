-- @null-groups none
-- @param-rejections none
INSERT INTO written_integer (id, state) VALUES (9001, 1.4)
RETURNING
  CASE WHEN state = 1 THEN NULL ELSE 'nonnull' END AS absent, -- @alwaysNull
  CASE WHEN state = 1 THEN 'nonnull' ELSE NULL END AS present -- @notNull
