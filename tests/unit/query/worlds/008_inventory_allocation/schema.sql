-- A tenant-scoped inventory domain. Warehouses hold item lots, allocation
-- requests reserve stock, count adjustments revise lots, and movement events
-- preserve the before/after evidence produced by those revisions.

CREATE TYPE lot_state AS ENUM ('available', 'depleted', 'retired');
CREATE TYPE request_state AS ENUM ('open', 'allocated', 'cancelled');
CREATE TYPE reservation_state AS ENUM ('pending', 'confirmed', 'released');

CREATE TABLE inventory_tenants (
  id            int PRIMARY KEY,
  tenant_code   text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  created_at    timestamptz NOT NULL,
  suspended_at  timestamptz,
  support_note  text,
  CONSTRAINT inventory_tenant_identity
    CHECK (tenant_code <> '' AND display_name <> ''),
  CONSTRAINT inventory_tenant_suspension
    CHECK (suspended_at IS NULL OR suspended_at >= created_at),
  CONSTRAINT inventory_tenant_note
    CHECK (support_note IS NULL OR support_note <> tenant_code)
);

CREATE TABLE warehouses (
  tenant_id    int NOT NULL REFERENCES inventory_tenants (id),
  warehouse_id int NOT NULL,
  warehouse_code text NOT NULL,
  warehouse_name text NOT NULL,
  region         text NOT NULL,
  opened_at      timestamptz NOT NULL,
  retired_at     timestamptz,
  manager_name   text,
  PRIMARY KEY (tenant_id, warehouse_id),
  UNIQUE (tenant_id, warehouse_code),
  CONSTRAINT warehouse_identity
    CHECK (warehouse_code <> '' AND warehouse_name <> '' AND region <> ''),
  CONSTRAINT warehouse_service_window
    CHECK (retired_at IS NULL OR retired_at >= opened_at),
  CONSTRAINT warehouse_manager_state
    CHECK (retired_at IS NULL OR manager_name IS NULL OR manager_name <> '')
);

CREATE TABLE inventory_items (
  tenant_id    int NOT NULL REFERENCES inventory_tenants (id),
  item_id      int NOT NULL,
  sku          text NOT NULL,
  unit_name    text NOT NULL,
  category     text NOT NULL,
  description  text,
  retired_at   timestamptz,
  reorder_note text,
  current_label text GENERATED ALWAYS AS (
    CASE WHEN retired_at IS NULL THEN sku ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, item_id),
  UNIQUE (tenant_id, sku),
  CONSTRAINT item_identity
    CHECK (sku <> '' AND unit_name <> '' AND category <> ''),
  CONSTRAINT item_retirement_note
    CHECK (retired_at IS NULL OR reorder_note IS NULL),
  CONSTRAINT item_description_distinct
    CHECK (description IS NULL OR description <> sku)
);

CREATE TABLE stock_lots (
  tenant_id      int NOT NULL,
  lot_id         int NOT NULL,
  warehouse_id   int NOT NULL,
  item_id        int NOT NULL,
  lot_code       text NOT NULL,
  on_hand        int NOT NULL,
  reserved       int NOT NULL,
  state          lot_state NOT NULL,
  expires_at     timestamptz,
  depleted_at    timestamptz,
  count_note     text,
  counted_by     text,
  availability_marker text GENERATED ALWAYS AS (
    CASE WHEN depleted_at IS NULL THEN lot_code ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, lot_id),
  UNIQUE (tenant_id, warehouse_id, lot_code),
  FOREIGN KEY (tenant_id, warehouse_id)
    REFERENCES warehouses (tenant_id, warehouse_id),
  FOREIGN KEY (tenant_id, item_id)
    REFERENCES inventory_items (tenant_id, item_id),
  CONSTRAINT lot_quantities
    CHECK (on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand),
  CONSTRAINT lot_state_evidence
    CHECK (CASE state
      WHEN 'available' THEN depleted_at IS NULL AND on_hand > reserved
      WHEN 'depleted' THEN depleted_at IS NOT NULL AND on_hand = reserved
      WHEN 'retired' THEN depleted_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT lot_expiry_state
    CHECK (expires_at IS NULL OR depleted_at IS NULL OR expires_at <= depleted_at),
  CONSTRAINT lot_count_evidence
    CHECK (count_note IS NULL OR counted_by IS NOT NULL),
  CONSTRAINT lot_count_identity
    CHECK (counted_by IS NULL OR counted_by <> lot_code)
);

CREATE TABLE allocation_requests (
  tenant_id      int NOT NULL,
  request_id     int NOT NULL,
  warehouse_id   int NOT NULL,
  item_id        int NOT NULL,
  requested_qty  int NOT NULL,
  priority       int NOT NULL,
  state          request_state NOT NULL,
  requested_at   timestamptz NOT NULL,
  needed_by      timestamptz,
  request_note   text,
  PRIMARY KEY (tenant_id, request_id),
  FOREIGN KEY (tenant_id, warehouse_id)
    REFERENCES warehouses (tenant_id, warehouse_id),
  FOREIGN KEY (tenant_id, item_id)
    REFERENCES inventory_items (tenant_id, item_id),
  CONSTRAINT request_quantity_priority
    CHECK (requested_qty > 0 AND priority > 0),
  CONSTRAINT request_schedule
    CHECK (needed_by IS NULL OR needed_by >= requested_at),
  CONSTRAINT request_state_note
    CHECK (state <> 'cancelled' OR request_note IS NOT NULL),
  CONSTRAINT request_note_identity
    CHECK (request_note IS NULL OR request_note <> request_id::text)
);

CREATE TABLE reservations (
  tenant_id       int NOT NULL,
  reservation_id  int NOT NULL,
  request_id      int NOT NULL,
  lot_id          int NOT NULL,
  reserved_qty    int NOT NULL,
  state           reservation_state NOT NULL,
  actor_label     text NOT NULL,
  reservation_note text,
  released_at     timestamptz,
  allocation_marker text GENERATED ALWAYS AS (
    CASE WHEN released_at IS NULL THEN actor_label ELSE NULL END
  ) STORED,
  PRIMARY KEY (tenant_id, reservation_id),
  UNIQUE (tenant_id, request_id, lot_id),
  FOREIGN KEY (tenant_id, request_id)
    REFERENCES allocation_requests (tenant_id, request_id),
  FOREIGN KEY (tenant_id, lot_id)
    REFERENCES stock_lots (tenant_id, lot_id),
  CONSTRAINT reservation_quantity_actor
    CHECK (reserved_qty > 0 AND actor_label <> ''),
  CONSTRAINT reservation_release_state
    CHECK (CASE state
      WHEN 'pending' THEN released_at IS NULL
      WHEN 'confirmed' THEN released_at IS NULL
      WHEN 'released' THEN released_at IS NOT NULL
      ELSE NULL
    END),
  CONSTRAINT reservation_note_identity
    CHECK (reservation_note IS NULL OR reservation_note <> actor_label),
  CONSTRAINT reservation_release_note
    CHECK (released_at IS NULL OR reservation_note IS NOT NULL)
);

CREATE TABLE stock_adjustments (
  tenant_id     int NOT NULL,
  adjustment_id int NOT NULL,
  lot_id         int NOT NULL,
  batch_code     text NOT NULL,
  quantity_delta int NOT NULL,
  approved       boolean NOT NULL,
  actor_label    text,
  adjustment_note text,
  proposed_expires_at timestamptz,
  recorded_at    timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, adjustment_id),
  FOREIGN KEY (tenant_id, lot_id)
    REFERENCES stock_lots (tenant_id, lot_id),
  CONSTRAINT adjustment_identity
    CHECK (batch_code <> '' AND quantity_delta <> 0),
  CONSTRAINT adjustment_approval_actor
    CHECK (NOT approved OR actor_label IS NOT NULL),
  CONSTRAINT adjustment_note_distinct
    CHECK (adjustment_note IS NULL OR actor_label IS NULL OR adjustment_note <> actor_label),
  CONSTRAINT adjustment_expiry_recording
    CHECK (proposed_expires_at IS NULL OR proposed_expires_at >= recorded_at)
);

CREATE TABLE movement_events (
  tenant_id     int NOT NULL,
  event_id      int NOT NULL,
  lot_id        int NOT NULL,
  before_qty    int NOT NULL,
  after_qty     int NOT NULL,
  actor_label   text NOT NULL,
  previous_note text,
  current_note  text NOT NULL,
  happened_at   timestamptz NOT NULL,
  movement_class text GENERATED ALWAYS AS (
    CASE
      WHEN after_qty > before_qty THEN 'increase'
      WHEN after_qty < before_qty THEN 'decrease'
      ELSE NULL
    END
  ) STORED,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, lot_id)
    REFERENCES stock_lots (tenant_id, lot_id),
  CONSTRAINT movement_quantities
    CHECK (before_qty >= 0 AND after_qty >= 0 AND before_qty <> after_qty),
  CONSTRAINT movement_actor_note
    CHECK (actor_label <> '' AND current_note <> ''),
  CONSTRAINT movement_previous_distinct
    CHECK (previous_note IS NULL OR previous_note <> current_note),
  CONSTRAINT movement_classification_inputs
    CHECK (movement_class IS NOT NULL OR before_qty = after_qty)
);
