-- The inner UPDATE establishes reversal evidence. The INSERT consumer filters
-- the still-nullable net amount before writing it to a required ledger amount;
-- a missing composite charge key executes the statement without producing a
-- row, so cardinality supplies no output proof.
-- @args [1, "ch-disputed", 20, "2026-08-06T12:00:00Z"]
-- @args [999, "missing", 21, "2026-08-06T12:05:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 notNull
-- @param 4 notNull
-- @null-groups none
-- @param-rejections none
WITH revised AS (
  UPDATE charges AS c
  SET state = 'reversed',
      reversal_ref = 'reversal-' || c.provider_charge_id
  WHERE c.merchant_id = $1
    AND c.provider_charge_id = $2
    AND c.state = 'disputed'
  RETURNING
    c.merchant_id,
    c.account_code,
    c.provider_charge_id,
    c.net_amount,
    c.reversal_ref
)
INSERT INTO ledger_entries
  (id, merchant_id, account_code, provider_charge_id, batch_ref, kind, amount,
   occurred_at, reference)
SELECT
  $3, r.merchant_id, r.account_code, r.provider_charge_id, NULL, 'reversal',
  -r.net_amount, $4, r.reversal_ref
FROM revised r
WHERE r.net_amount IS NOT NULL
RETURNING
  id,                  -- @notNull
  provider_charge_id,  -- @notNull
  batch_ref,           -- @alwaysNull
  amount,              -- @notNull
  reference            -- @notNull
