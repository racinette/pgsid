-- Two parameters against columns that three overlapping constraints mention,
-- one of them the status the arms key on.
SELECT
  s.id,
  s.shipped_at,
  s.delivered_at
FROM shipments s
WHERE s.status = $1
  AND s.shipped_at >= $2
