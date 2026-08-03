-- Multi-WHEN CHECK CASE, the arm distinctness unlocks: reaching the second
-- arm requires the FIRST arm's condition FALSE, and TRUE(kind = 'auto')
-- now falsifies kind = 'manual' — distinct text tokens under a collation
-- the snapshot proved deterministic. Wave 6 could only ever select the
-- first arm. actor is unconstrained on auto rows and stays nullable,
-- witnessed by the auto row's NULL actor.
SELECT
  bot_id,   -- @notNull
  actor     -- @nullable
FROM audit_log
WHERE kind = 'auto'
