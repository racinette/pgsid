-- The returned target and USING rows both exist, but their evidence remains
-- relation-local: the request reason does not make the grant note present.
-- @args [1, 300]
-- @args [1, 999]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
DELETE FROM role_grants AS g
USING revocation_requests AS r
WHERE r.tenant_id = g.tenant_id
  AND r.grant_id = g.grant_id
  AND g.tenant_id = $1
  AND r.request_id = $2
  AND g.revoked_at IS NOT NULL
  AND r.approved_at IS NOT NULL
  AND r.reason IS NOT NULL
RETURNING
  g.tenant_id,       -- @notNull
  g.grant_id,        -- @notNull
  g.revoked_at,      -- @notNull
  g.revocation_note, -- @notNull
  g.expires_at,      -- @nullable
  r.requested_at,    -- @notNull
  r.approved_at,     -- @notNull
  r.reason           -- @notNull
