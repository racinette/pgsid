-- The DELETE may produce no row. Only a produced row reaches the audit INSERT,
-- where either actor binding suffices and their joint absence is rejected.
-- The final tenant row observes the recorded audit unit as present or absent.
-- @args [1, 203, 50, "security desk", "automation", "2026-08-02T12:00:00Z"]
-- @args [1, 999, 51, null, null, "2026-08-02T12:05:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 notNull
-- @param 4 nullable
-- @param 5 nullable
-- @param 6 notNull
-- @null-group 1*,2*,3*,4*
-- @param-reject 4,5
WITH removed AS (
  DELETE FROM role_grants AS g
  WHERE g.tenant_id = $1
    AND g.grant_id = $2
    AND g.revoked_at IS NOT NULL
  RETURNING
    g.tenant_id,
    g.principal_id,
    g.grant_id,
    g.revocation_note
), recorded AS (
  INSERT INTO audit_events
    (event_id, tenant_id, subject_principal_id, event_kind, occurred_at,
     actor_label, detail, previous_expiry)
  SELECT
    $3,
    r.tenant_id,
    r.principal_id,
    'grant_removed',
    $6,
    coalesce($4::text, $5::text),
    r.revocation_note,
    NULL
  FROM removed AS r
  RETURNING tenant_id, subject_principal_id, actor_label, classification
)
SELECT
  t.tenant_slug,           -- @notNull
  a.tenant_id,             -- @nullable
  a.subject_principal_id,  -- @nullable
  a.actor_label,           -- @nullable
  a.classification         -- @nullable
FROM tenants AS t
LEFT JOIN recorded AS a ON a.tenant_id = t.id
WHERE t.id = $1
