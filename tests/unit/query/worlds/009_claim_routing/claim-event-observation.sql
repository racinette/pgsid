-- @params none
-- @null-group 1*,2
-- @null-group 3*,4
-- @null-group 5*,6
-- @param-rejections none
SELECT
  r.external_ref,          -- @notNull
  c.claim_id,              -- @nullable
  c.open_marker,           -- @nullable
  e.event_id,              -- @nullable
  e.transition_marker,     -- @nullable
  a.assignment_id,         -- @nullable
  a.assignment_note,       -- @nullable
  d.display_name           -- @nullable
FROM claim_registry AS r
LEFT JOIN routed_claims AS c
  ON c.tenant_id = r.tenant_id AND c.claim_id = r.claim_id
LEFT JOIN claim_events AS e
  ON e.tenant_id = c.tenant_id AND e.claim_id = c.claim_id
LEFT JOIN claim_assignments AS a
  ON a.tenant_id = r.tenant_id AND a.claim_id = r.claim_id
LEFT JOIN claim_adjusters AS d
  ON d.tenant_id = a.tenant_id AND d.adjuster_id = a.adjuster_id
