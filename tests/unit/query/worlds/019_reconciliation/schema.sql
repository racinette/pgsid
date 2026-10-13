-- @world checks
CREATE TABLE payment_reconciliations (
  id integer PRIMARY KEY,
  expected_amount numeric,
  posted_amount numeric,
  manually_approved boolean NOT NULL,
  CONSTRAINT reconciled_amounts CHECK (
    manually_approved IS TRUE OR expected_amount IS NOT DISTINCT FROM posted_amount
  )
);

CREATE TABLE credential_rotations (
  id integer PRIMARY KEY,
  previous_token uuid,
  replacement_token uuid,
  rotation_required boolean NOT NULL,
  CONSTRAINT replacement_changes_token CHECK (
    CASE WHEN rotation_required
      THEN previous_token IS DISTINCT FROM replacement_token
      ELSE previous_token IS NOT DISTINCT FROM replacement_token
    END
  )
);

CREATE TABLE routing_handoffs (
  id integer PRIMARY KEY,
  previous_route inet,
  next_route cidr,
  confirmed boolean,
  CONSTRAINT confirmed_route_agrees CHECK (
    (previous_route IS NOT DISTINCT FROM next_route) IS NOT DISTINCT FROM confirmed
  )
);

CREATE TABLE allocation_corrections (
  id integer PRIMARY KEY,
  requested_units integer,
  assigned_units integer,
  split_count integer,
  bypass_review boolean NOT NULL,
  CONSTRAINT corrected_share_agrees CHECK (
    bypass_review OR requested_units / split_count IS NOT DISTINCT FROM assigned_units
  )
);
