-- @null-groups none
-- @param-rejections none
UPDATE written_integer SET state = 1.4 WHERE id = 1
RETURNING
  CASE WHEN state = 1 THEN NULL ELSE 'nonnull' END AS absent, -- @alwaysNull
  CASE WHEN state = 1 THEN 'nonnull' ELSE NULL END AS present -- @notNull
