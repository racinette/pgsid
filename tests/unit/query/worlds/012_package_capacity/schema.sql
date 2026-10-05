-- @world checks

CREATE DOMAIN unit_count AS smallint CHECK (VALUE >= 0);
CREATE DOMAIN warehouse_count AS unit_count;

CREATE TABLE stock_batches (
  id integer PRIMARY KEY,
  received smallint,
  dispatched smallint,
  reserve integer,
  available bigint,
  CONSTRAINT dispatch_limit CHECK (dispatched <= received),
  CONSTRAINT reserve_limit CHECK (reserve >= received),
  CONSTRAINT available_limit CHECK (available >= received),
  CONSTRAINT nonnegative_received CHECK (received >= 0)
);

CREATE TABLE package_capacity (
  id integer PRIMARY KEY,
  width integer,
  height integer,
  capacity integer,
  slots integer,
  batch_size integer,
  adjustment integer,
  CONSTRAINT area_limit CHECK (width * height <= capacity),
  CONSTRAINT slot_limit CHECK (capacity / batch_size <= slots),
  CONSTRAINT whole_batches CHECK (capacity % batch_size = 0),
  CONSTRAINT adjustment_limit CHECK (abs(adjustment) <= capacity)
);

CREATE TABLE warehouse_allocations (
  id integer PRIMARY KEY,
  units warehouse_count,
  limit_count smallint,
  CONSTRAINT allocation_limit CHECK (units <= limit_count)
);
