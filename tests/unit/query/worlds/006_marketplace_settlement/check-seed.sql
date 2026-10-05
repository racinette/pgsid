-- name: active_merchant_with_contact
INSERT INTO merchants (id, display_name, country_code, contact_email, suspended_at)
VALUES (100, 'Check Market', 'NO', 'check@market.test', NULL);
-- name: active_merchant_without_contact
INSERT INTO merchants (id, display_name, country_code, contact_email, suspended_at)
VALUES (100, 'Check Market', 'NO', NULL, NULL);

-- name: suspended_merchant_without_contact
INSERT INTO merchants (id, display_name, country_code, contact_email, suspended_at) VALUES (10000, 'Check Market', 'NO', NULL, '2026-08-02 10:00+00');
-- name: pending_charge_without_optional_references
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, provider_event_at) VALUES (10000, 1, 'ch-check', 'main', 'pending', 1, '2026-08-02 10:00+00');
-- name: pending_charge_with_zero_gross_amount
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, provider_event_at) VALUES (10000, 1, 'ch-check', 'main', 'pending', 0, '2026-08-02 10:00+00');
-- name: charge_with_empty_reversal_reference
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, provider_event_at, reversal_ref) VALUES (10000, 1, 'ch-check', 'main', 'pending', 1, '2026-08-02 10:00+00', '');
-- name: account_without_reserve_note
INSERT INTO settlement_accounts (merchant_id, account_code, currency_code, provider_account, activated_at, reserve_note) VALUES (1, 'check', 'NOK', 'acct-check', '2026-08-02 10:00+00', NULL);
-- name: account_note_repeats_provider
INSERT INTO settlement_accounts (merchant_id, account_code, currency_code, provider_account, activated_at, reserve_note) VALUES (1, 'check', 'NOK', 'acct-check', '2026-08-02 10:00+00', 'acct-check');
-- name: open_payout_without_note
INSERT INTO payout_batches (merchant_id, batch_ref, account_code, state, declared_amount, opened_at) VALUES (1, 'B-CHECK', 'main', 'open', 1, '2026-08-02 10:00+00');
-- name: payout_with_zero_amount
INSERT INTO payout_batches (merchant_id, batch_ref, account_code, state, declared_amount, opened_at) VALUES (1, 'B-CHECK', 'main', 'open', 0, '2026-08-02 10:00+00');
-- name: charge_ledger_without_note
INSERT INTO ledger_entries (id, merchant_id, account_code, provider_charge_id, kind, amount, occurred_at, reference, note) VALUES (10000, 1, 'main', 'ch-captured', 'charge', 1, '2026-08-02 10:00+00', 'CHECK-LEDGER', NULL);
-- name: ledger_note_repeats_reference
INSERT INTO ledger_entries (id, merchant_id, account_code, provider_charge_id, kind, amount, occurred_at, reference, note) VALUES (10000, 1, 'main', 'ch-captured', 'charge', 1, '2026-08-02 10:00+00', 'CHECK-LEDGER', 'CHECK-LEDGER');

-- name: charge_tiny_positive_amount
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, provider_event_at) VALUES (10000, 1, 'ch-check', 'main', 'pending', 0.00000000000000000000001, '2026-08-02 10:00+00');
-- name: charge_amount_above_bigint_range
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, provider_event_at) VALUES (10000, 1, 'ch-check', 'main', 'pending', 9223372036854775808.01, '2026-08-02 10:00+00');
-- name: charge_with_negative_zero_amount
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, provider_event_at) VALUES (10000, 1, 'ch-check', 'main', 'pending', -0.0000, '2026-08-02 10:00+00');
-- name: charge_with_negative_fractional_fee
INSERT INTO charges (id, merchant_id, provider_charge_id, account_code, state, gross_amount, fee_amount, provider_event_at) VALUES (10000, 1, 'ch-check', 'main', 'pending', 1, -0.00000000000000000000001, '2026-08-02 10:00+00');
-- name: reversal_ledger_negative_fraction
INSERT INTO ledger_entries (id, merchant_id, account_code, provider_charge_id, kind, amount, occurred_at, reference, note) VALUES (10000, 1, 'main', 'ch-captured', 'reversal', -0.00000000000000000000001, '2026-08-02 10:00+00', 'CHECK-LEDGER', NULL);
-- name: reversal_ledger_positive_fraction
INSERT INTO ledger_entries (id, merchant_id, account_code, provider_charge_id, kind, amount, occurred_at, reference, note) VALUES (10000, 1, 'main', 'ch-captured', 'reversal', 0.00000000000000000000001, '2026-08-02 10:00+00', 'CHECK-LEDGER', NULL);
-- name: charge_ledger_zero_amount
INSERT INTO ledger_entries (id, merchant_id, account_code, provider_charge_id, kind, amount, occurred_at, reference, note) VALUES (10000, 1, 'main', 'ch-captured', 'charge', 0, '2026-08-02 10:00+00', 'CHECK-LEDGER', NULL);
-- name: charge_ledger_negative_fraction
INSERT INTO ledger_entries (id, merchant_id, account_code, provider_charge_id, kind, amount, occurred_at, reference, note) VALUES (10000, 1, 'main', 'ch-captured', 'charge', -0.00000000000000000000001, '2026-08-02 10:00+00', 'CHECK-LEDGER', NULL);
-- name: payout_nan_amount
INSERT INTO payout_batches (merchant_id, batch_ref, account_code, state, declared_amount, opened_at) VALUES (1, 'B-CHECK', 'main', 'open', 'NaN'::numeric, '2026-08-02 10:00+00');
