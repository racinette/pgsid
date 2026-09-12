-- @null-groups none
-- @param-rejections none
-- The arms write opposite CHECK discriminators, so their intersection must
-- contribute no state fact. PostgreSQL returns one value and one NULL.
MERGE INTO written_state AS w
USING (VALUES (1, true), (2, false)) AS incoming(id, has_value)
ON incoming.id = w.id
WHEN MATCHED AND incoming.has_value THEN UPDATE SET state = 'full'
WHEN MATCHED THEN UPDATE SET state = 'empty'
RETURNING
  w.display_value -- @nullable
