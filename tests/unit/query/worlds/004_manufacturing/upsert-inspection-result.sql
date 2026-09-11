-- The first binding conflicts with the seeded temperature result; the second
-- inserts vibration for that inspection. Both paths construct a non-NULL
-- comment even though its source binding is optional.
-- @args [99, 1, "temperature", 21.5, 18, 24, "2026-02-01T10:05:00Z", null]
-- @args [100, 1, "vibration", 1.2, 0, 2, "2026-02-01T10:06:00Z", "manual check"]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 notNull
-- @param 4 nullable
-- @param 5 nullable
-- @param 6 nullable
-- @param 7 notNull
-- @param 8 nullable
-- @null-groups none
-- @param-rejections none
INSERT INTO inspection_results
  (id, inspection_id, metric_name, measured_value, lower_limit, upper_limit,
   recorded_at, comment)
VALUES
  ($1, $2, $3, $4, $5, $6, $7, coalesce($8::text, 'captured automatically'))
ON CONFLICT (inspection_id, metric_name) DO UPDATE SET
  measured_value = EXCLUDED.measured_value,
  lower_limit = EXCLUDED.lower_limit,
  upper_limit = EXCLUDED.upper_limit,
  recorded_at = EXCLUDED.recorded_at,
  comment = EXCLUDED.comment
RETURNING
  id,              -- @notNull
  inspection_id,   -- @notNull
  metric_name,     -- @notNull
  measured_value,  -- @nullable
  comment,          -- @notNull
  verdict           -- @nullable
