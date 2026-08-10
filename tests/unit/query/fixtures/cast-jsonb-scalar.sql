-- The other half of the cast finding: every jsonb → scalar cast is NULL for a
-- JSON null, and `data` is a NOT NULL column, so these are the cast's own
-- NULLs. The jsonb → text conversion stays claimed, which is what separates a
-- real narrowing from withdrawing every cast's claim.
--
-- @raises: cannot cast jsonb object to type
-- @no-rows: every events row holds a jsonb OBJECT, and casting one to a
-- scalar RAISES ("cannot cast jsonb object to type integer") rather than
-- returning the NULL this fixture is about — the NULL needs a JSON null,
-- which the shared data deliberately does not carry (its rows exist to
-- witness `->` on a missing key). The claims below are still held by the
-- walk suite; what is missing is the execution oracle, and the NULL-capability
-- of these signatures is held instead by the surface probe, which witnesses
-- `int4(jsonb)` and its five siblings directly.
SELECT
  data::int4    AS c1,  -- @nullable
  data::float8  AS c2,  -- @nullable
  data::numeric AS c3,  -- @nullable
  data::bool    AS c4,  -- @nullable
  data::text    AS c5   -- @notNull
FROM events
