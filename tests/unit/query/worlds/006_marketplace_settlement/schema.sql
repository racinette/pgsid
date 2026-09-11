-- A marketplace settlement domain. Merchants receive provider charges through
-- settlement accounts, disputes revise those charges, payout batches collect
-- the proceeds, and ledger entries record each resulting movement.

CREATE TYPE charge_state AS ENUM ('pending', 'captured', 'disputed', 'reversed');
CREATE TYPE payout_state AS ENUM ('open', 'closed', 'cancelled');
CREATE TYPE ledger_kind AS ENUM ('charge', 'reversal', 'payout');

CREATE TABLE merchants (
  id           int PRIMARY KEY,
  display_name text NOT NULL,
  country_code text NOT NULL,
  contact_email text,
  suspended_at timestamptz,
  CONSTRAINT merchant_identity_present
    CHECK (display_name <> '' AND country_code <> ''),
  CONSTRAINT merchant_contact_while_active
    CHECK (suspended_at IS NOT NULL OR contact_email IS NOT NULL)
);

CREATE TABLE settlement_accounts (
  merchant_id     int NOT NULL REFERENCES merchants (id),
  account_code    text NOT NULL,
  currency_code   text NOT NULL,
  provider_account text NOT NULL,
  activated_at    timestamptz NOT NULL,
  disabled_at     timestamptz,
  reserve_note    text,
  PRIMARY KEY (merchant_id, account_code),
  UNIQUE (merchant_id, provider_account),
  CONSTRAINT account_identity_present
    CHECK (account_code <> '' AND provider_account <> ''),
  CONSTRAINT account_service_window
    CHECK (disabled_at IS NULL OR disabled_at >= activated_at),
  CONSTRAINT account_reserve_distinct
    CHECK (reserve_note IS NULL OR reserve_note <> provider_account)
);

CREATE TABLE charges (
  id                  int PRIMARY KEY,
  merchant_id         int NOT NULL,
  provider_charge_id  text NOT NULL,
  account_code        text NOT NULL,
  state               charge_state NOT NULL,
  gross_amount        numeric NOT NULL,
  fee_amount          numeric,
  settled_amount      numeric,
  provider_event_at   timestamptz NOT NULL,
  settled_at          timestamptz,
  dispute_opened_at   timestamptz,
  reversal_ref        text,
  provider_note       text,
  net_amount          numeric GENERATED ALWAYS AS (
    CASE
      WHEN settled_amount IS NULL THEN NULL
      ELSE settled_amount - coalesce(fee_amount, 0)
    END
  ) STORED,
  settlement_marker   text GENERATED ALWAYS AS (
    CASE WHEN settled_at IS NULL THEN NULL ELSE provider_charge_id END
  ) STORED,
  UNIQUE (merchant_id, provider_charge_id),
  FOREIGN KEY (merchant_id, account_code)
    REFERENCES settlement_accounts (merchant_id, account_code),
  CONSTRAINT charge_amounts_sane
    CHECK (gross_amount > 0 AND (fee_amount IS NULL OR fee_amount >= 0)),
  CONSTRAINT charge_settlement_amount_sane
    CHECK (settled_amount IS NULL OR (settled_amount >= 0 AND settled_amount <= gross_amount)),
  CONSTRAINT charge_state_evidence
    CHECK (CASE state
      WHEN 'pending' THEN settled_at IS NULL AND settled_amount IS NULL
      WHEN 'captured' THEN settled_at IS NOT NULL AND settled_amount IS NOT NULL
      WHEN 'disputed' THEN settled_at IS NOT NULL AND settled_amount IS NOT NULL
                           AND dispute_opened_at IS NOT NULL
      WHEN 'reversed' THEN settled_at IS NOT NULL AND settled_amount IS NOT NULL
                           AND reversal_ref IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT charge_event_precedes_settlement
    CHECK (settled_at IS NULL OR settled_at >= provider_event_at),
  CONSTRAINT charge_dispute_follows_event
    CHECK (dispute_opened_at IS NULL OR dispute_opened_at >= provider_event_at),
  CONSTRAINT charge_reversal_reference_present
    CHECK (reversal_ref IS NULL OR reversal_ref <> ''),
  CONSTRAINT charge_note_distinct
    CHECK (provider_note IS NULL OR provider_note <> provider_charge_id)
);

CREATE TABLE disputes (
  merchant_id        int NOT NULL,
  provider_charge_id text NOT NULL,
  reason             text NOT NULL,
  opened_at          timestamptz NOT NULL,
  resolved_at        timestamptz,
  outcome            text,
  evidence_ref       text,
  PRIMARY KEY (merchant_id, provider_charge_id),
  FOREIGN KEY (merchant_id, provider_charge_id)
    REFERENCES charges (merchant_id, provider_charge_id),
  CONSTRAINT dispute_timeline
    CHECK (resolved_at IS NULL OR resolved_at >= opened_at),
  CONSTRAINT dispute_resolution_evidence
    CHECK (CASE
      WHEN resolved_at IS NULL THEN outcome IS NULL
      ELSE outcome IS NOT NULL
    END),
  CONSTRAINT dispute_evidence_distinct
    CHECK (evidence_ref IS NULL OR evidence_ref <> reason)
);

CREATE TABLE payout_batches (
  merchant_id       int NOT NULL,
  batch_ref         text NOT NULL,
  account_code      text NOT NULL,
  state             payout_state NOT NULL,
  declared_amount   numeric NOT NULL,
  opened_at         timestamptz NOT NULL,
  closed_at         timestamptz,
  provider_receipt  text,
  close_note        text,
  settlement_marker text GENERATED ALWAYS AS (
    CASE WHEN closed_at IS NULL THEN NULL ELSE coalesce(provider_receipt, batch_ref) END
  ) STORED,
  PRIMARY KEY (merchant_id, batch_ref),
  FOREIGN KEY (merchant_id, account_code)
    REFERENCES settlement_accounts (merchant_id, account_code),
  CONSTRAINT payout_amount_sane
    CHECK (declared_amount > 0 AND account_code <> ''),
  CONSTRAINT payout_state_evidence
    CHECK (CASE state
      WHEN 'open' THEN closed_at IS NULL AND provider_receipt IS NULL
      WHEN 'closed' THEN closed_at IS NOT NULL AND provider_receipt IS NOT NULL
      WHEN 'cancelled' THEN closed_at IS NULL
      ELSE NULL
    END),
  CONSTRAINT payout_timeline
    CHECK (closed_at IS NULL OR closed_at >= opened_at),
  CONSTRAINT payout_close_note_distinct
    CHECK (close_note IS NULL OR close_note <> batch_ref)
);

CREATE TABLE ledger_entries (
  id                  int PRIMARY KEY,
  merchant_id         int NOT NULL,
  account_code        text NOT NULL,
  provider_charge_id  text,
  batch_ref           text,
  kind                ledger_kind NOT NULL,
  amount              numeric NOT NULL,
  occurred_at         timestamptz NOT NULL,
  reference           text NOT NULL,
  note                text,
  FOREIGN KEY (merchant_id, account_code)
    REFERENCES settlement_accounts (merchant_id, account_code),
  FOREIGN KEY (merchant_id, provider_charge_id)
    REFERENCES charges (merchant_id, provider_charge_id),
  FOREIGN KEY (merchant_id, batch_ref)
    REFERENCES payout_batches (merchant_id, batch_ref),
  CONSTRAINT ledger_owner_present
    CHECK (account_code <> '' AND reference <> ''),
  CONSTRAINT ledger_subject_by_kind
    CHECK (CASE kind
      WHEN 'charge' THEN provider_charge_id IS NOT NULL AND batch_ref IS NULL
      WHEN 'reversal' THEN provider_charge_id IS NOT NULL AND batch_ref IS NULL
      WHEN 'payout' THEN provider_charge_id IS NULL AND batch_ref IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT ledger_amount_direction
    CHECK ((kind = 'reversal' AND amount <= 0) OR (kind <> 'reversal' AND amount >= 0)),
  CONSTRAINT ledger_note_distinct
    CHECK (note IS NULL OR note <> reference)
);
