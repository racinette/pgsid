-- A cast does NOT preserve its argument's nullability, which the walk assumed
-- until the pg_cast capture landed. Both counterexamples are ordinary values
-- rather than exotica: an infinite timestamp has no time of day, and a JSON
-- null converts to a SQL NULL. `ts` and `data` are NOT NULL columns, so the
-- NULLs below are the CAST's own.
--
-- The verdict comes from the cast's implementation function via pg_cast, so
-- the total conversions keep their claim in the same query — which is the
-- point of resolving it from the capture rather than from a list.
SELECT
  ts::date       AS c1,  -- @notNull
  ts::time       AS c2,  -- @nullable
  ts::timestamptz AS c3, -- @notNull
  id::numeric    AS c4,  -- @notNull
  id::text       AS c5   -- @notNull
FROM inf_t
