-- @args ["Hemoglobin", "2025-01-01T00:00:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  s.id,              -- @notNull
  s.test_name,       -- @notNull
  s.collected_at,    -- @notNull
  s.result_display   -- @nullable
FROM lab_samples s
WHERE s.test_name = $1
  AND s.collected_at >= $2
