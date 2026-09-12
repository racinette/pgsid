-- A quantity increase selects the generated movement classification while the
-- prior count note remains historical and optional.
-- @args [1, 0]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  m.event_id,          -- @notNull
  m.before_qty,        -- @notNull
  m.after_qty,         -- @notNull
  m.movement_class,    -- @notNull
  m.previous_note      -- @nullable
FROM movement_events AS m
WHERE m.tenant_id = $1
  AND m.after_qty - m.before_qty > $2
