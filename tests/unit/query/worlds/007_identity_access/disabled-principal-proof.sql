-- The disabled CHECK arm supplies both lifecycle facts, and the generated
-- marker reads the same constrained timestamp.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  p.tenant_id,         -- @notNull
  p.principal_id,      -- @notNull
  p.disabled_at,       -- @notNull
  p.disabled_reason,   -- @notNull
  p.lifecycle_marker,  -- @notNull
  p.review_note        -- @nullable
FROM principals AS p
WHERE p.state = 'disabled'
