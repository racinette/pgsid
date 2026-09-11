-- One source row closes B-OPEN, one inserts B-NEW, and source-absent B-STALE
-- is cancelled. Source columns therefore form one optional presence unit in
-- RETURNING, while the target row exists on every producing arm.
-- @params none
-- @null-group 1*,2*,3*,4*
-- @param-rejections none
MERGE INTO payout_batches AS p
USING (VALUES
  (1, 'B-OPEN'::text, 'main'::text, 170::numeric,
   TIMESTAMPTZ '2026-08-05 08:00+00', TIMESTAMPTZ '2026-08-06 08:00+00',
   'receipt-north'::text),
  (2, 'B-NEW'::text, 'main'::text, 45::numeric,
   TIMESTAMPTZ '2026-08-06 08:00+00', TIMESTAMPTZ '2026-08-06 09:00+00',
   'receipt-new'::text)
) AS incoming
  (merchant_id, batch_ref, account_code, declared_amount, opened_at, closed_at,
   provider_receipt)
ON p.merchant_id = incoming.merchant_id
 AND p.batch_ref = incoming.batch_ref
WHEN MATCHED THEN
  UPDATE SET state = 'closed',
             declared_amount = incoming.declared_amount,
             closed_at = incoming.closed_at,
             provider_receipt = incoming.provider_receipt
WHEN NOT MATCHED BY TARGET THEN
  INSERT
    (merchant_id, batch_ref, account_code, state, declared_amount, opened_at,
     closed_at, provider_receipt)
  VALUES
    (incoming.merchant_id, incoming.batch_ref, incoming.account_code, 'closed',
     incoming.declared_amount, incoming.opened_at, incoming.closed_at,
     incoming.provider_receipt)
WHEN NOT MATCHED BY SOURCE AND p.state = 'open' THEN
  UPDATE SET state = 'cancelled', closed_at = NULL, provider_receipt = NULL
RETURNING
  merge_action(),              -- @notNull
  incoming.merchant_id,        -- @nullable
  incoming.batch_ref,          -- @nullable
  incoming.closed_at,          -- @nullable
  incoming.provider_receipt,   -- @nullable
  p.merchant_id,               -- @notNull
  p.batch_ref,                 -- @notNull
  p.closed_at,                 -- @nullable
  p.settlement_marker          -- @nullable
