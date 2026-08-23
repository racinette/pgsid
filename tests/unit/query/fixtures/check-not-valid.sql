-- The convalidated=false negative, NOT VALID rendering: guest_badge_claimed
-- (badge IS NOT NULL) was added NOT VALID, so pre-existing rows may violate
-- it and the engine must ignore it — the nullable claim below is what holds
-- that. It can never be witnessed from fixture data, and that is a property
-- of NOT VALID itself: new writes ARE gated, the schema is applied before
-- any data state, so every reachable row satisfies the constraint anyway.
-- @unwitnessable 0: NOT VALID still gates new writes, so no fixture row can
--   carry a NULL badge, and no single statement can dangle one either — the
--   CTE trick the two fk-entail fixtures use needs a route that does not gate
--   writes. The BIT is witnessed regardless: `check-not-enforced.sql` reaches
--   the same `convalidated = false` through NOT ENFORCED, on a real seeded
--   row, and the adapter reads only that bit. So this file pins the NOT VALID
--   RENDERING, and could not catch a regression on its own.
SELECT
  badge,   -- @nullable
  id       -- @notNull
FROM guest
WHERE status = 'housed'
