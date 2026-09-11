-- A new provider charge is captured directly, while a conflict revises only
-- an existing disputed charge. The conflict predicate selects the searched
-- CASE arm that rejects jointly absent state candidates. Inserted notes are
-- constructed non-NULL, but the update path retains the nullable target note.
-- @args [10, 1, "ch-disputed", "main", 105, 5, "captured", "captured", "2026-08-03T09:30:00Z", "provider revision"]
-- @args [11, 2, "ch-new", "main", 30, null, null, null, "2026-08-06T10:00:00Z", null]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 notNull
-- @param 4 notNull
-- @param 5 notNull
-- @param 6 nullable
-- @param 7 nullable
-- @param 8 nullable
-- @param 9 notNull
-- @param 10 nullable
-- @null-groups none
-- @param-reject 7,8
INSERT INTO charges
  (id, merchant_id, provider_charge_id, account_code, state, gross_amount,
   fee_amount, settled_amount, provider_event_at, settled_at,
   dispute_opened_at, reversal_ref, provider_note)
VALUES
  ($1, $2, $3, $4, 'captured', $5, $6, $5, $9, $9, NULL, NULL,
   coalesce($10::text, 'provider event'))
ON CONFLICT (merchant_id, provider_charge_id) DO UPDATE SET
  state = CASE
    WHEN charges.state = 'disputed'
      THEN coalesce($7::charge_state, $8::charge_state)
    ELSE charges.state
  END,
  gross_amount = EXCLUDED.gross_amount,
  fee_amount = EXCLUDED.fee_amount,
  settled_amount = EXCLUDED.settled_amount,
  provider_event_at = EXCLUDED.provider_event_at,
  settled_at = EXCLUDED.settled_at,
  provider_note = charges.provider_note
WHERE charges.state = 'disputed'
  AND charges.provider_event_at <= EXCLUDED.provider_event_at
RETURNING
  id,                 -- @notNull
  state,              -- @notNull
  settled_at,         -- @notNull
  dispute_opened_at,  -- @nullable
  provider_note,      -- @nullable
  net_amount,         -- @notNull
  settlement_marker  -- @notNull
