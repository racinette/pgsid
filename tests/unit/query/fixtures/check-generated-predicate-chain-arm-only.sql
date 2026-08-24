-- Half of check-generated-predicate-chain.sql's evidence, alone: status
-- = 3 selects the arm, but nothing pins `event_duration`. The null
-- policy seeds a (status 3, has_duration false) row whose duration IS
-- NULL, and NULL under a strict `+` is NULL — so an arm-selection rung
-- that forgot to walk the arm's BODY would claim this one notNull.
SELECT
  finished_at -- @nullable
FROM evg
WHERE status = 3
