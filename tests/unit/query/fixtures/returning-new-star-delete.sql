-- PG18's `RETURNING new.*` on DELETE — the other absent row.
--
-- The twin of returning-old-star-insert.sql: a DELETE has no new row, so
-- the star must still contribute the target's four columns (the shape is
-- the contract) and every one is NULL on every returned row — witnessed,
-- not excused. Together the pair pins both names through the same
-- expansion context.
DELETE FROM ck WHERE id = 1
RETURNING new.*
  -- @nullable
  -- @nullable
  -- @nullable
  -- @nullable
