-- @args [1, "NA"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  t.tenant_code,       -- @notNull
  p.policy_number,     -- @notNull
  r.external_ref,      -- @notNull
  c.claim_id,          -- @notNull
  c.incident_note,     -- @nullable
  c.open_marker,       -- @nullable
  c.settlement_marker  -- @nullable
FROM claim_tenants AS t
JOIN claim_policies AS p ON p.tenant_id = t.tenant_id
JOIN claim_registry AS r
  ON r.tenant_id = p.tenant_id AND r.policy_id = p.policy_id
JOIN routed_claims AS c
  ON c.tenant_id = r.tenant_id AND c.claim_id = r.claim_id
WHERE t.tenant_id = $1 AND p.jurisdiction = $2
