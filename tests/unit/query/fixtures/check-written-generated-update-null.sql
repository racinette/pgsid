-- @null-groups none
-- @param-rejections none
-- The UPDATE changes the discriminator but not the generated expression's
-- dependency. NEW-row written evidence selects the CHECK arm that makes the
-- dependency NULL; the generated result follows.
UPDATE written_state AS w
SET state = 'empty'
FROM (VALUES (2)) AS selected(id)
WHERE w.id = selected.id
RETURNING
  w.display_value -- @alwaysNull
