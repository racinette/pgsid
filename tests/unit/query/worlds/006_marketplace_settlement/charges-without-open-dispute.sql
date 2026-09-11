-- Absence of an open dispute selects charges but donates no positive fact
-- from the missing relation to nullable charge business data.
-- @args [1, 1]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  c.id,                -- @notNull
  c.gross_amount,      -- @notNull
  c.provider_note,     -- @nullable
  c.dispute_opened_at, -- @nullable
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM disputes d
      WHERE d.merchant_id = c.merchant_id
        AND d.provider_charge_id = c.provider_charge_id
        AND d.resolved_at IS NULL
    ) THEN c.reversal_ref
    ELSE NULL::text
  END                  -- @nullable
FROM charges c
WHERE c.merchant_id = $1
  AND c.gross_amount >= $2
  AND NOT EXISTS (
    SELECT 1
    FROM disputes d
    WHERE d.merchant_id = c.merchant_id
      AND d.provider_charge_id = c.provider_charge_id
      AND d.resolved_at IS NULL
  )
