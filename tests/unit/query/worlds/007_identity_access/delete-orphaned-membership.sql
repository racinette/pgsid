-- The expired membership is removed only with a revoked-grant witness and no
-- live grant. The anti-witness controls eligibility but contributes no row.
-- @args [1, 101, 12, "2026-09-01T00:00:00Z"]
-- @args [1, 100, 10, "2026-09-01T00:00:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param 4 nullable
-- @null-groups none
-- @param-rejections none
DELETE FROM group_memberships AS m
WHERE m.tenant_id = $1
  AND m.group_id = $2
  AND m.principal_id = $3
  AND m.expires_at <= $4
  AND EXISTS (
    SELECT 1
    FROM role_grants AS witnessed
    WHERE witnessed.tenant_id = m.tenant_id
      AND witnessed.principal_id = m.principal_id
      AND witnessed.revoked_at IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM role_grants AS live
    WHERE live.tenant_id = m.tenant_id
      AND live.principal_id = m.principal_id
      AND live.revoked_at IS NULL
  )
RETURNING
  m.tenant_id,    -- @notNull
  m.group_id,     -- @notNull
  m.principal_id, -- @notNull
  m.expires_at,   -- @notNull
  m.revoked_at,   -- @nullable
  m.source_note   -- @nullable
