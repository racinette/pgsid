-- @args [1]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
UPDATE routed_claims AS c
SET stage = 'closed',
    closed_at = '2026-09-07 10:00+00',
    resolution_note = ' no payout ',
    review_note = 'destination review'
WHERE c.tenant_id = $1
  AND c.claim_id IN (100, 104)
  AND c.jurisdiction = 'NA'
  AND c.stage = 'active'
RETURNING WITH (OLD AS before, NEW AS after)
  before.claim_id,          -- @notNull
  before.stage,             -- @notNull
  before.closed_at,         -- @alwaysNull
  before.resolution_note,   -- @alwaysNull
  before.open_marker,       -- @notNull
  after.claim_id,           -- @notNull
  after.stage,              -- @notNull
  after.closed_at,          -- @nullable
  after.resolution_note,    -- @nullable
  after.review_note,        -- @nullable
  after.open_marker,        -- @nullable
  after.settlement_marker   -- @nullable
