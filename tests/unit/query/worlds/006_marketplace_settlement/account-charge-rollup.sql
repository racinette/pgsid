-- The composite account key correlates the lateral aggregate. Grouping makes
-- the lateral row absent for an account with no charges; another account has
-- a present group whose provider-note aggregate is nevertheless NULL.
-- @params none
-- @null-group 2*,3*,4*,5
-- @param-rejections none
SELECT
  a.merchant_id,             -- @notNull
  a.account_code,            -- @notNull
  totals.merchant_id,        -- @nullable
  totals.account_code,       -- @nullable
  totals.charge_count,       -- @nullable
  totals.latest_note         -- @nullable
FROM settlement_accounts a
LEFT JOIN LATERAL (
  SELECT
    c.merchant_id,
    c.account_code,
    count(*) AS charge_count,
    max(c.provider_note) AS latest_note
  FROM charges c
  WHERE c.merchant_id = a.merchant_id
    AND c.account_code = a.account_code
  GROUP BY c.merchant_id, c.account_code
) totals ON true
