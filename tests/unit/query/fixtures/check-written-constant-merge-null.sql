-- @null-groups none
-- @param-rejections none
-- MERGE has the same NEW-row evidence channel as UPDATE. The only producing
-- arm changes checked-out to in-flight while preserving its required NULL.
MERGE INTO guest AS g
USING (VALUES (4)) AS s(id) ON s.id = g.id
WHEN MATCHED THEN UPDATE SET status = 'in-flight'
RETURNING
  g.arrived_at -- @alwaysNull
