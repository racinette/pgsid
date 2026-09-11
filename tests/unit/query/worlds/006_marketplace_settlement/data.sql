-- The rows witness both sides of every conditional boundary. Merchant 3's
-- account has no charges; merchant 2's account has charges whose notes are all
-- NULL. B-OPEN is matched by MERGE, B-STALE is absent from its source, and the
-- incoming merchant-2 batch has no target.

INSERT INTO merchants (id, display_name, country_code, contact_email, suspended_at) VALUES
  (1, 'North Market', 'NO', 'settlement@north.test', NULL),
  (2, 'Baltic Books', 'EE', 'finance@baltic.test', NULL),
  (3, 'Quiet Crafts', 'FI', 'owner@quiet.test', NULL);

INSERT INTO settlement_accounts
  (merchant_id, account_code, currency_code, provider_account, activated_at,
   disabled_at, reserve_note)
VALUES
  (1, 'main', 'NOK', 'acct-north-main', '2026-01-01 08:00+00', NULL, NULL),
  (1, 'reserve', 'NOK', 'acct-north-reserve', '2026-01-01 08:00+00',
   '2026-07-01 08:00+00', 'legacy reserve'),
  (2, 'main', 'EUR', 'acct-baltic-main', '2026-02-01 08:00+00', NULL, NULL),
  (3, 'main', 'EUR', 'acct-quiet-main', '2026-03-01 08:00+00', NULL, NULL);

INSERT INTO charges
  (id, merchant_id, provider_charge_id, account_code, state, gross_amount,
   fee_amount, settled_amount, provider_event_at, settled_at,
   dispute_opened_at, reversal_ref, provider_note)
VALUES
  (1, 1, 'ch-disputed', 'main', 'disputed', 100, 5, 95,
   '2026-08-01 09:00+00', '2026-08-01 09:05+00', '2026-08-03 10:00+00', NULL, NULL),
  (2, 1, 'ch-captured', 'main', 'captured', 80, NULL, 80,
   '2026-08-02 09:00+00', '2026-08-02 09:04+00', NULL, NULL, 'provider accepted'),
  (3, 1, 'ch-pending', 'reserve', 'pending', 25, NULL, NULL,
   '2026-08-04 09:00+00', NULL, NULL, NULL, NULL),
  (4, 2, 'ch-settled', 'main', 'captured', 50, 5, 50,
   '2026-08-02 11:00+00', '2026-08-02 11:03+00', NULL, NULL, NULL);

INSERT INTO disputes
  (merchant_id, provider_charge_id, reason, opened_at, resolved_at, outcome, evidence_ref)
VALUES
  (1, 'ch-disputed', 'buyer claim', '2026-08-03 10:00+00', NULL, NULL, 'case-100'),
  (2, 'ch-settled', 'late delivery', '2026-08-03 12:00+00',
   '2026-08-05 12:00+00', 'merchant won', NULL);

INSERT INTO payout_batches
  (merchant_id, batch_ref, account_code, state, declared_amount, opened_at,
   closed_at, provider_receipt, close_note)
VALUES
  (1, 'B-OPEN', 'main', 'open', 170, '2026-08-05 08:00+00', NULL, NULL, NULL),
  (1, 'B-STALE', 'main', 'open', 20, '2026-07-01 08:00+00', NULL, NULL, 'awaiting funds'),
  (2, 'B-CLOSED', 'main', 'closed', 45, '2026-08-03 08:00+00',
   '2026-08-04 08:00+00', 'receipt-baltic', NULL);

INSERT INTO ledger_entries
  (id, merchant_id, account_code, provider_charge_id, batch_ref, kind, amount,
   occurred_at, reference, note)
VALUES
  (1, 1, 'main', 'ch-captured', NULL, 'charge', 80,
   '2026-08-02 09:04+00', 'charge-ch-captured', NULL),
  (2, 2, 'main', NULL, 'B-CLOSED', 'payout', 45,
   '2026-08-04 08:00+00', 'payout-B-CLOSED', 'bank transfer');
