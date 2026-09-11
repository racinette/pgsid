-- Positive and negative witnesses inspect the same grant relation. They
-- decide booleans and a branch, but the absent live row donates no columns.
-- @args [1, 12]
-- @args [1, 10]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  p.display_name, -- @notNull
  EXISTS (
    SELECT 1 FROM role_grants AS any_grant
    WHERE any_grant.tenant_id = p.tenant_id
      AND any_grant.principal_id = p.principal_id
  ), -- @notNull
  NOT EXISTS (
    SELECT 1 FROM role_grants AS live_grant
    WHERE live_grant.tenant_id = p.tenant_id
      AND live_grant.principal_id = p.principal_id
      AND live_grant.revoked_at IS NULL
  ), -- @notNull
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM role_grants AS live_grant
      WHERE live_grant.tenant_id = p.tenant_id
        AND live_grant.principal_id = p.principal_id
        AND live_grant.revoked_at IS NULL
    ) THEN p.disabled_reason
    ELSE NULL::text
  END -- @nullable
FROM principals AS p
WHERE p.tenant_id = $1
  AND p.principal_id = $2
