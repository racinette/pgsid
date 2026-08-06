-- Gate: a NOT VALID foreign key entails nothing.
--
-- Pre-existing rows are unchecked when the constraint is added, so a row with
-- no parent survives to be read back through this join — measured, and the
-- reason the adapter reads `convalidated` rather than the mere existence of a
-- key. The same bit is false for a PG18 NOT ENFORCED key, and
-- `ALTER CONSTRAINT … NOT ENFORCED` clears it on an already-validated one, so
-- one gate covers all three routes.
--
-- Like check-not-valid.sql, this cannot be witnessed from fixture data: NOT
-- VALID still gates new WRITES, and the schema is applied before any data
-- state, so every seeded row satisfies the key anyway. The claim under test is
-- the engine REFUSING to read it.
-- @unwitnessable 1: NOT VALID gates new writes, so no fixture row can dangle;
--   what this pins is the engine ignoring the key, which the annotation-based
--   suite holds
SELECT
  f.o_id   AS o_id,     -- @notNull
  o.status AS status    -- @nullable
FROM fk_nv f
LEFT JOIN orders o ON o.id = f.o_id
