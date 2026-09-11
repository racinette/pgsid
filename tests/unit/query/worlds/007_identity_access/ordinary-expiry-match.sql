-- Ordinary equality is strict: any returned row proves the optional expiry
-- and the parameter used to match it were both present.
-- @args [1, "2026-12-31T23:00:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  g.grant_id,   -- @notNull
  g.expires_at, -- @notNull
  g.revoked_at  -- @nullable
FROM role_grants AS g
WHERE g.tenant_id = $1
  AND g.expires_at = $2
