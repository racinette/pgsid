-- The convalidated=false negative, NOT VALID rendering: guest_badge_claimed
-- (badge IS NOT NULL) was added NOT VALID, so pre-existing rows may violate
-- it and the engine must ignore it — the nullable claim below is what holds
-- that. It can never be witnessed from fixture data, and that is a property
-- of NOT VALID itself: new writes ARE gated, the schema is applied before
-- any data state, so every reachable row satisfies the constraint anyway.
-- @unwitnessable 0: NOT VALID still gates new writes, so no fixture row can
-- carry a NULL badge; the claim under test is the engine IGNORING the
-- constraint, and the annotation-based suite holds it.
SELECT
  badge,   -- @nullable
  id       -- @notNull
FROM guest
WHERE status = 'housed'
