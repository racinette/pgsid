-- IS NOT DISTINCT FROM can match two NULLs, so a NULL binding neither proves
-- the lifecycle column present nor prevents a returned row.
-- @args [1, null]
-- @args [1, "2026-08-01T11:00:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  g.grant_id,        -- @notNull
  g.revoked_at,      -- @nullable
  g.grant_marker,    -- @nullable
  g.revocation_note  -- @nullable
FROM role_grants AS g
WHERE g.tenant_id = $1
  AND g.revoked_at IS NOT DISTINCT FROM $2
