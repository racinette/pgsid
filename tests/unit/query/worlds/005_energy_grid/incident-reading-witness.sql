-- The correlated EXISTS proves the exact scalar lookup has a row. A stricter
-- consumer can still remove that row, while different correlation columns or
-- a different relation receive no proof from the witness.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  i.id, -- @notNull
  (SELECT r.observed_at FROM meter_readings r
   WHERE r.id = i.reading_id), -- @notNull
  (SELECT r.observed_at FROM meter_readings r
   WHERE r.id = i.reading_id AND r.quality = 'missing'), -- @nullable
  (SELECT r.observed_at FROM meter_readings r
   WHERE r.id = i.node_id), -- @nullable
  (SELECT m.installed_on FROM meters m
   WHERE m.id = i.node_id), -- @nullable
  (SELECT d.dispatched_at FROM dispatch_actions d
   WHERE d.incident_id = i.id) -- @nullable
FROM grid_incidents i
WHERE EXISTS (
  SELECT 1
  FROM meter_readings witness
  WHERE witness.id = i.reading_id
    AND witness.suppressed_at IS NULL
)
