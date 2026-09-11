-- The completed state selects the CHECK arm that supplies both progress and
-- completion time; operational notes remain optional.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  r.id,            -- @notNull
  r.produced_qty,  -- @notNull
  r.finished_at,   -- @notNull
  r.notes          -- @nullable
FROM production_runs r
WHERE r.state = 'completed'
