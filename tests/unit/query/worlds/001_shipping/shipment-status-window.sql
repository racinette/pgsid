-- Two parameters against columns that three overlapping constraints mention,
-- one of them the status the arms key on.
-- @args ["shipped", "2024-01-01T00:00:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  s.id,          -- @notNull
  s.shipped_at,  -- @notNull
  s.delivered_at -- @nullable
FROM shipments s
WHERE s.status = $1
  AND s.shipped_at >= $2
