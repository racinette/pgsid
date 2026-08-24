-- The working half of transitive nullability (the ground
-- generated-predicate-red.test.ts stands on, held here against
-- regression): bare-boolean WHERE evidence — TRUE(has_duration) — makes
-- the CHECK's second disjunct FALSE, the OR descends to its survivor,
-- and the conjunction's `event_duration IS NOT NULL` is a fact on every
-- returned row.
SELECT
  event_duration -- @notNull
FROM evg
WHERE has_duration
