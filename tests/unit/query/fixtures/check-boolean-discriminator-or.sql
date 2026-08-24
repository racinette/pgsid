-- One half of transitive nullability, over the PLAIN column: this is
-- what check-generated-predicate-chain.sql carries through the generated
-- CASE, and it worked on its own long before that did. Bare-boolean
-- WHERE evidence — TRUE(has_duration) — makes
-- the CHECK's second disjunct FALSE, the OR descends to its survivor,
-- and the conjunction's `event_duration IS NOT NULL` is a fact on every
-- returned row.
SELECT
  event_duration -- @notNull
FROM evg
WHERE has_duration
