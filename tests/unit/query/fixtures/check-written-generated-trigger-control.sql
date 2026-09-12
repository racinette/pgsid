-- @null-groups none
-- @param-rejections none
-- The BEFORE trigger replaces NEW after the literal was chosen. Odd ids return
-- a generated value and even ids return NULL, so written evidence must be
-- withheld and the output remains nullable.
UPDATE written_state_hook
SET state = 'empty'
RETURNING
  display_value -- @nullable
