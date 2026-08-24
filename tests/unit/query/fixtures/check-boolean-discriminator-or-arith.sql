-- The same pin composed one expression up: the reading site carries the
-- CHECK-derived fact into strict arithmetic over a declared-NOT NULL
-- operand — exactly the arm body the generated column's red target will
-- need, minus the CASE around it.
SELECT
  started_at + event_duration AS ends_at -- @notNull
FROM evg
WHERE has_duration
