-- The same chain with the operand pinned by the statement instead of by
-- the CHECK: ordinary WHERE promotion supplies `event_duration IS NOT
-- NULL`, the guard-TRUE consumer supplies the arm. Sibling of
-- check-generated-predicate-chain.sql, and the reason both exist is that
-- they fail differently — this one survives a broken CHECK harvest, that
-- one survives a broken promotion, and only the guard link is common.
SELECT
  finished_at -- @notNull
FROM evg
WHERE status = 3 AND event_duration IS NOT NULL
