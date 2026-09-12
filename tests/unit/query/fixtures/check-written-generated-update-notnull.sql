-- @null-groups none
-- @param-rejections none
-- The non-NULL mirror: the written state selects the CHECK arm requiring a
-- source value, which makes the strict generated expression non-NULL.
UPDATE written_state
SET state = 'full'
WHERE id = 1
RETURNING
  display_value -- @notNull
