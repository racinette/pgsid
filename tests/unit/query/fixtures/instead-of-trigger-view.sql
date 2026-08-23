-- An INSTEAD OF trigger returns whatever NEW it builds, and RETURNING
-- reports that row verbatim — the view's own definition expressions are
-- never evaluated (measured: even the literal `lit` comes back NULL, and
-- the trigger nulls k). So the view-definition analysis is void alongside
-- the written-value map, and every column drops to the view's catalog
-- flags, which are all attnotnull=false. The trigger happens to preserve
-- id, which the engine cannot know.
-- @unwitnessable 0: this trigger keeps NEW.id as written, so no data reaches
--   a NULL id here. Nothing about the RULE is uncovered by that: `k` is
--   passed in as 'v' and comes back NULL from the same trigger in the same
--   statement, which is the whole justification for refusing to trust the
--   row, and `lit` shows the view's own expressions are never evaluated.
--   What is unwitnessed is one COLUMN of one trigger, not the refusal.
INSERT INTO iot_v (id, k) VALUES (601, 'v')
RETURNING
  id,  -- @nullable
  k,   -- @nullable
  lit  -- @nullable
