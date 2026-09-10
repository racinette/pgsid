-- A library circulation domain. Members borrow books and may reserve titles
-- before a loan exists; fulfilled reservations point back to the resulting loan.

CREATE TYPE membership_state AS ENUM ('active', 'suspended', 'expired');
CREATE TYPE loan_state AS ENUM ('open', 'returned', 'lost');
CREATE TYPE reservation_state AS ENUM ('waiting', 'ready', 'fulfilled', 'cancelled');

CREATE TABLE library_members (
  id               int PRIMARY KEY,
  full_name        text NOT NULL,
  email            text,
  phone            text,
  state            membership_state NOT NULL,
  joined_on        date NOT NULL,
  expires_on       date,
  suspended_on     date,
  CONSTRAINT member_has_contact
    CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT member_state_dates
    CHECK (CASE state
      WHEN 'active' THEN suspended_on IS NULL
      WHEN 'suspended' THEN suspended_on IS NOT NULL
      WHEN 'expired' THEN expires_on IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT member_term_order
    CHECK (expires_on IS NULL OR expires_on >= joined_on)
);

CREATE TABLE books (
  id                int PRIMARY KEY,
  isbn              text NOT NULL UNIQUE,
  title             text NOT NULL,
  author            text NOT NULL,
  published_on      date,
  retired_on        date,
  replacement_cost  numeric,
  shelf_code        text,
  circulation_label text GENERATED ALWAYS AS (
    CASE WHEN retired_on IS NOT NULL THEN NULL ELSE shelf_code END
  ) STORED,
  CONSTRAINT book_catalog_dates
    CHECK (published_on IS NULL OR retired_on IS NULL OR published_on <= retired_on),
  CONSTRAINT book_retirement_location
    CHECK (retired_on IS NULL OR shelf_code IS NULL),
  CONSTRAINT book_cost_matches_location
    CHECK (replacement_cost IS NULL OR shelf_code IS NULL OR replacement_cost > 0)
);

CREATE TABLE loans (
  id              int PRIMARY KEY,
  member_id       int NOT NULL REFERENCES library_members (id),
  book_id         int NOT NULL REFERENCES books (id),
  checked_out_on  date NOT NULL,
  due_on          date NOT NULL,
  returned_on     date,
  renewal_count   int NOT NULL,
  state           loan_state NOT NULL,
  fee_waived_on   date,
  CONSTRAINT loan_due_after_checkout
    CHECK (due_on >= checked_out_on),
  CONSTRAINT loan_return_chronology
    CHECK (returned_on IS NULL OR returned_on >= checked_out_on),
  CONSTRAINT loan_state_dates
    CHECK (CASE state
      WHEN 'open' THEN returned_on IS NULL
      WHEN 'returned' THEN returned_on IS NOT NULL
      WHEN 'lost' THEN returned_on IS NULL
      ELSE NULL
    END),
  CONSTRAINT loan_fee_waiver_follows_return
    CHECK (fee_waived_on IS NULL OR returned_on IS NOT NULL)
);

CREATE TABLE reservations (
  id                 int PRIMARY KEY,
  member_id          int NOT NULL REFERENCES library_members (id),
  book_id            int NOT NULL REFERENCES books (id),
  requested_on       date NOT NULL,
  ready_on           date,
  expires_on         date,
  priority           int NOT NULL,
  state              reservation_state NOT NULL,
  fulfilled_loan_id  int REFERENCES loans (id),
  CONSTRAINT reservation_window
    CHECK (ready_on IS NULL OR expires_on IS NULL OR ready_on <= expires_on),
  CONSTRAINT reservation_state_dates
    CHECK (CASE state
      WHEN 'waiting' THEN ready_on IS NULL AND fulfilled_loan_id IS NULL
      WHEN 'ready' THEN ready_on IS NOT NULL AND fulfilled_loan_id IS NULL
      WHEN 'fulfilled' THEN ready_on IS NOT NULL AND fulfilled_loan_id IS NOT NULL
      WHEN 'cancelled' THEN fulfilled_loan_id IS NULL
      ELSE NULL
    END),
  CONSTRAINT reservation_priority_timing
    CHECK (priority > 0 AND (ready_on IS NULL OR requested_on <= ready_on))
);
