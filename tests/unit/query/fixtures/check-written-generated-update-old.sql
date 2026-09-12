-- @null-groups none
-- @param-rejections none
-- The SET expression is not a constant, so NEW contributes no written fact.
-- Because source_value was not replaced, the generated value equals OLD and
-- the OLD row's filter plus CHECK still proves it non-NULL.
UPDATE written_state
SET state = CASE WHEN state = 'ready' THEN 'full' ELSE state END
WHERE id = 1 AND state = 'ready'
RETURNING
  display_value -- @notNull
