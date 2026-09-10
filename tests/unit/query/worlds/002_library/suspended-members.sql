-- The state-specific CHECK is responsible for the suspension date on this arm.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  m.id,            -- @notNull
  m.full_name,     -- @notNull
  m.suspended_on,  -- @notNull
  m.expires_on     -- @nullable
FROM library_members m
WHERE m.state = 'suspended'
