-- @args ["manual review", 450]
-- @param 1 nullable
-- @param 2 nullable
-- @null-group 0*,1
-- @param-rejections none
INSERT INTO routed_claims
  (tenant_id, claim_id, jurisdiction, stage, policy_id, adjuster_id,
   loss_amount, reserve_amount, incident_at, intake_code, incident_note,
   resolution_note, review_note)
VALUES
  (1, 100, 'NA', 'active', 10, 10, 1200, $2, '2026-07-30 08:00+00',
   'INT-100', 'wind damage revised', 'conflict stale', $1),
  (1, 110, 'NA', 'active', 10, 10, 500, $2, '2026-09-06 08:00+00',
   'INT-110', 'shed damage', 'insert stale', $1)
ON CONFLICT (tenant_id, claim_id, jurisdiction, stage) DO UPDATE
SET reserve_amount = excluded.reserve_amount,
    incident_note = excluded.incident_note,
    resolution_note = excluded.resolution_note,
    review_note = excluded.review_note
RETURNING WITH (OLD AS before, NEW AS after)
  before.claim_id,        -- @nullable
  before.review_note,     -- @nullable
  after.claim_id,         -- @notNull
  after.resolution_note,  -- @nullable
  after.review_note       -- @nullable
