-- The other half: `has_duration` pins `event_duration` through the
-- CHECK's OR — check-boolean-discriminator-or.sql claims exactly that
-- over the plain column — but `status` is free, so the ELSE is
-- reachable and the status = 1 rows come back NULL. A guard consumer
-- that proved TRUE from an unrelated fact, or one that treated a
-- non-refuted guard as selected, would claim this notNull.
SELECT
  finished_at -- @nullable
FROM evg
WHERE has_duration
