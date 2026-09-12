-- @params none
-- @null-groups none
-- @param-rejections none
WITH leaf_rows AS (
  SELECT tenant_id, claim_id, stage, closed_at, resolution_note,
         open_marker, settlement_marker
  FROM routed_claims_na_active
  UNION ALL
  SELECT tenant_id, claim_id, stage, closed_at, resolution_note,
         open_marker, settlement_marker
  FROM routed_claims_na_closed
  UNION ALL
  SELECT tenant_id, claim_id, stage, closed_at, resolution_note,
         open_marker, settlement_marker
  FROM routed_claims_eu_active
  UNION ALL
  SELECT tenant_id, claim_id, stage, closed_at, resolution_note,
         open_marker, settlement_marker
  FROM routed_claims_eu_closed
), jurisdiction_rows AS (
  SELECT tenant_id, claim_id FROM routed_claims_na
  UNION ALL
  SELECT tenant_id, claim_id FROM routed_claims_eu
)
SELECT
  l.claim_id,          -- @notNull
  l.stage,             -- @notNull
  l.closed_at,         -- @nullable
  l.resolution_note,   -- @nullable
  l.open_marker,       -- @nullable
  l.settlement_marker  -- @nullable
FROM leaf_rows AS l
JOIN jurisdiction_rows AS j
  ON j.tenant_id = l.tenant_id AND j.claim_id = l.claim_id
