-- The same pin composed one expression up: the reading site carries the
-- CHECK-derived fact into strict arithmetic over a declared-NOT NULL
-- operand — literally the generated column's arm body,
-- minus the CASE around it (check-generated-predicate-chain.sql is the
-- statement that puts the CASE back).
SELECT
  started_at + event_duration AS ends_at -- @notNull
FROM evg
WHERE has_duration
