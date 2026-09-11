-- The required composite foreign key guarantees the exact account lookup has
-- a row. Adding a disabled-account predicate can still remove that row.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  c.id, -- @notNull
  (SELECT a.activated_at
   FROM settlement_accounts a
   WHERE a.merchant_id = c.merchant_id
     AND a.account_code = c.account_code), -- @notNull
  (SELECT a.disabled_at
   FROM settlement_accounts a
   WHERE a.merchant_id = c.merchant_id
     AND a.account_code = c.account_code
     AND a.disabled_at IS NOT NULL) -- @nullable
FROM charges c
