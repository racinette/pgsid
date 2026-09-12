-- @null-groups none
-- @param-rejections none
-- Both producing MERGE arms write the same discriminator. Their intersection
-- therefore supplies one NEW-row fact, and the CHECK carries it through the
-- generated expression.
MERGE INTO written_state AS w
USING (VALUES (1, true), (3, false)) AS incoming(id, first_arm)
ON incoming.id = w.id
WHEN MATCHED AND incoming.first_arm THEN UPDATE SET state = 'full'
WHEN MATCHED THEN UPDATE SET state = 'full'
RETURNING
  w.display_value -- @notNull
