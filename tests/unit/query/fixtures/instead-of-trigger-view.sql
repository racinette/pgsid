-- An INSTEAD OF trigger returns whatever NEW it builds, and RETURNING
-- reports that row verbatim — the view's own definition expressions are
-- never evaluated (measured: even the literal `lit` comes back NULL, and
-- the trigger nulls k). So the view-definition analysis is void alongside
-- the written-value map, and every column drops to the view's catalog
-- flags, which are all attnotnull=false. The trigger happens to preserve
-- id, which the engine cannot know.
-- @unwitnessable 0: this trigger keeps NEW.id as written; the engine
--   conservatively refuses to trust any of the trigger's row, and no data
--   can reach a NULL id through this fixture.
INSERT INTO iot_v (id, k) VALUES (601, 'v')
RETURNING
  id,  -- @nullable
  k,   -- @nullable
  lit  -- @nullable
