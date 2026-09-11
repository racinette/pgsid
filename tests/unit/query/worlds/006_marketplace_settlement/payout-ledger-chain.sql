-- A merchant always supplies the account and payout identity in the inner
-- chain, while a payout's ledger movement remains optional as one row unit.
-- @params none
-- @null-group 3*,4*
-- @param-rejections none
SELECT
  m.display_name,  -- @notNull
  a.provider_account, -- @notNull
  p.batch_ref,     -- @notNull
  l.id,            -- @nullable
  l.reference      -- @nullable
FROM merchants m
JOIN settlement_accounts a ON a.merchant_id = m.id
JOIN payout_batches p
  ON p.merchant_id = a.merchant_id
 AND p.account_code = a.account_code
LEFT JOIN ledger_entries l
  ON l.merchant_id = p.merchant_id
 AND l.batch_ref = p.batch_ref
