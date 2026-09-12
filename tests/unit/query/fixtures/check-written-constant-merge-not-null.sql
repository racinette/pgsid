-- @null-groups none
-- @param-rejections none
-- The non-NULL mirror for MERGE: the written arrived discriminator and the
-- validated CHECK force arrived_at non-NULL on every returned NEW row.
MERGE INTO guest AS g
USING (VALUES (2)) AS s(id) ON s.id = g.id
WHEN MATCHED THEN UPDATE SET status = 'arrived'
RETURNING
  g.arrived_at -- @notNull
