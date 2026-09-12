-- @args [1, 500]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
INSERT INTO routed_claims
  (tenant_id, claim_id, jurisdiction, stage, policy_id, loss_amount,
   reserve_amount, incident_at, intake_code, incident_note, resolution_note,
   closed_at, review_note)
SELECT
  i.tenant_id, i.claim_id, i.jurisdiction, i.stage, i.policy_id, i.loss_amount,
  i.reserve_amount, i.incident_at, i.intake_code, i.incident_note,
  i.resolution_note, i.closed_at, i.review_note
FROM claim_intake AS i
WHERE i.tenant_id = $1 AND i.intake_id >= $2
RETURNING WITH (OLD AS absent, NEW AS routed)
  absent.claim_id,           -- @alwaysNull
  routed.claim_id,           -- @notNull
  routed.jurisdiction,       -- @notNull
  routed.stage,              -- @notNull
  routed.resolution_note,    -- @nullable
  routed.review_note,        -- @nullable
  routed.open_marker,        -- @nullable
  routed.settlement_marker   -- @nullable
