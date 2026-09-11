-- The closed state selects receipt and closing-time evidence; the generated
-- settlement marker then cannot take its NULL arm.
-- @args ["2026-08-01T00:00:00Z", 1]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  p.merchant_id,       -- @notNull
  p.batch_ref,         -- @notNull
  p.closed_at,         -- @notNull
  p.provider_receipt,  -- @notNull
  p.settlement_marker, -- @notNull
  p.close_note         -- @nullable
FROM payout_batches p
WHERE p.state = 'closed'
  AND p.closed_at >= $1
  AND p.declared_amount >= $2
