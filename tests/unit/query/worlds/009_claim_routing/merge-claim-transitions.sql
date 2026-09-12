-- @args [1, 700]
-- @param 1 nullable
-- @param 2 nullable
-- @null-group 1*,2*,3
-- @param-rejections none
WITH transitioned
  (action_code, before_claim_id, before_stage, before_resolution,
   after_claim_id, after_stage, after_resolution, after_review,
   after_marker, request_id) AS (
  MERGE INTO routed_claims AS c
  USING claim_transition_requests AS r
  ON c.tenant_id = r.tenant_id
   AND c.claim_id = r.claim_id
   AND c.jurisdiction = r.from_jurisdiction
   AND c.stage = r.from_stage
  WHEN MATCHED AND r.tenant_id = $1 AND r.request_id >= $2 THEN
    UPDATE SET jurisdiction = r.to_jurisdiction,
               stage = r.to_stage,
               closed_at = r.closed_at,
               resolution_note = r.resolution_note,
               review_note = r.review_note
  WHEN NOT MATCHED BY TARGET AND r.tenant_id = $1 AND r.request_id >= $2 THEN
    INSERT
      (tenant_id, claim_id, jurisdiction, stage, policy_id, adjuster_id,
       loss_amount, reserve_amount, incident_at, intake_code, incident_note,
       resolution_note, closed_at, review_note)
    VALUES
      (r.tenant_id, r.claim_id, r.to_jurisdiction, r.to_stage, 11, 11,
       350, NULL, r.requested_at, 'MERGE-' || r.request_id::text,
       'routed merge intake', r.resolution_note, r.closed_at, r.review_note)
  RETURNING WITH (OLD AS before, NEW AS after)
    merge_action(),
    before.claim_id,
    before.stage,
    before.resolution_note,
    after.claim_id,
    after.stage,
    after.resolution_note,
    after.review_note,
    after.settlement_marker,
    r.request_id
)
SELECT
  t.action_code,       -- @notNull
  t.before_claim_id,   -- @nullable
  t.before_stage,      -- @nullable
  t.before_resolution, -- @nullable
  t.after_claim_id,    -- @notNull
  t.after_stage,       -- @notNull
  t.after_resolution, -- @nullable
  t.after_review,      -- @nullable
  t.after_marker,      -- @nullable
  t.request_id         -- @notNull
FROM transitioned AS t
