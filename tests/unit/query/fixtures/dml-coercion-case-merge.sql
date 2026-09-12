-- @null-groups none
-- @param-rejections none
MERGE INTO written_integer AS target
USING (VALUES (1)) AS incoming(id) ON target.id = incoming.id
WHEN MATCHED THEN UPDATE SET state = 1.4
RETURNING
  CASE WHEN target.state = 1 THEN NULL ELSE 'nonnull' END AS absent, -- @alwaysNull
  CASE WHEN target.state = 1 THEN 'nonnull' ELSE NULL END AS present -- @notNull
