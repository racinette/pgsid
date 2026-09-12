-- @args [1, "direct review"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
UPDATE routed_claims_na_active AS c
SET review_note = $2
WHERE c.tenant_id = $1 AND c.claim_id = 100
RETURNING WITH (OLD AS before, NEW AS after)
  before.claim_id,          -- @notNull
  before.review_note,       -- @nullable
  before.resolution_note,   -- @alwaysNull
  after.claim_id,           -- @notNull
  after.review_note,        -- @nullable
  after.resolution_note,    -- @alwaysNull
  after.open_marker,        -- @notNull
  after.settlement_marker   -- @alwaysNull
