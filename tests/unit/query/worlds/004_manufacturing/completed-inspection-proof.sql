-- A completed inspection carries its time, inspector, and outcome together;
-- notes are not required by the state arm.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  i.id,            -- @notNull
  i.inspected_at,  -- @notNull
  i.inspector,     -- @notNull
  i.outcome,       -- @notNull
  i.notes          -- @nullable
FROM inspections i
WHERE i.status = 'completed'
