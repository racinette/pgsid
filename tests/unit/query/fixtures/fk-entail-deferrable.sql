-- Gate: a DEFERRABLE foreign key entails nothing.
--
-- `SET CONSTRAINTS ALL DEFERRED` inside a transaction lets a violating row be
-- written AND observed before the commit that would reject it — measured, with
-- `INITIALLY IMMEDIATE`, which is why the gate is on condeferrable rather than
-- condeferred. The engine cannot know which transaction its query will run in.
--
-- Unwitnessable for the same reason as the NOT VALID gate: the fixture suite
-- never defers, so every seeded row satisfies the key.
-- @unwitnessable 1: the suite runs no deferred transaction, so no fixture row
--   can dangle; what this pins is the engine ignoring the key
SELECT
  f.o_id   AS o_id,     -- @notNull
  o.status AS status    -- @nullable
FROM fk_df f
LEFT JOIN orders o ON o.id = f.o_id
