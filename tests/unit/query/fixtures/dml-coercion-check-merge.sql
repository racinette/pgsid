-- @null-groups none
-- @param-rejections none
MERGE INTO written_coercion AS target
USING (VALUES (1)) AS incoming(id) ON target.id = incoming.id
WHEN MATCHED THEN UPDATE SET state = 'a '
RETURNING
  target.amount, -- @alwaysNull
  target.display_value -- @alwaysNull
