-- A principal can lack a membership, and a present membership can point to a
-- group that has since retired. The membership row remains one optional unit.
-- @params none
-- @null-group 2*,3,4
-- @param-rejections none
SELECT
  t.tenant_slug,    -- @notNull
  p.display_name,   -- @notNull
  m.group_id,       -- @nullable
  m.expires_at,     -- @nullable
  m.active_marker,  -- @nullable
  g.retired_at      -- @nullable
FROM tenants AS t
JOIN principals AS p ON p.tenant_id = t.id
LEFT JOIN group_memberships AS m
  ON m.tenant_id = p.tenant_id
 AND m.principal_id = p.principal_id
LEFT JOIN access_groups AS g
  ON g.tenant_id = m.tenant_id
 AND g.group_id = m.group_id
