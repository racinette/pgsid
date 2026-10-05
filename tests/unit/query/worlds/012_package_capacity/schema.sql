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

CREATE TABLE small_package_capacity (
  id integer PRIMARY KEY,
  width smallint,
  height smallint,
  capacity smallint,
  slots smallint,
  batch_size smallint,
  adjustment smallint,
  skip_batch_checks boolean,
  CONSTRAINT small_area_limit CHECK (width * height <= capacity),
  CONSTRAINT small_slot_limit CHECK (CASE WHEN skip_batch_checks THEN true ELSE capacity / batch_size <= slots END),
  CONSTRAINT small_whole_batches CHECK (CASE WHEN skip_batch_checks THEN true ELSE capacity % batch_size = 0 END),
  CONSTRAINT small_adjustment_limit CHECK (abs(adjustment) <= capacity)
);

CREATE TABLE stock_reconciliations (
  id integer PRIMARY KEY,
  received smallint,
  returned smallint,
  dispatched smallint,
  available smallint,
  CONSTRAINT stock_balance CHECK (received + returned - dispatched = available)
);

CREATE TABLE warehouse_corrections (
  id integer PRIMARY KEY,
  delta smallint,
  reversal smallint,
  maximum smallint,
  CONSTRAINT correction_reversal CHECK (-delta = reversal),
  CONSTRAINT correction_limit CHECK (abs(delta) <= maximum)
);

CREATE TABLE mixed_stock_balances (
  id integer PRIMARY KEY,
  units warehouse_count,
  reserve integer,
  total integer,
  adjustment smallint,
  adjusted integer,
  remaining integer,
  residual integer,
  CONSTRAINT reservation_total CHECK (units + reserve = total),
  CONSTRAINT adjusted_total CHECK (total + adjustment = adjusted),
  CONSTRAINT remaining_units CHECK (units - reserve = remaining),
  CONSTRAINT residual_units CHECK (total - units = residual)
);

CREATE TABLE mixed_package_capacity (
  id integer PRIMARY KEY,
  width smallint,
  height integer,
  capacity integer,
  slots integer,
  batch_size smallint,
  CONSTRAINT mixed_area_limit CHECK (width * height <= capacity),
  CONSTRAINT mixed_slot_limit CHECK (CASE WHEN batch_size = 0 THEN true ELSE capacity / batch_size <= slots END)
);

CREATE TABLE bulk_package_capacity (
  id integer PRIMARY KEY,
  units smallint,
  items_per_batch integer,
  slots integer,
  maximum integer,
  CONSTRAINT bulk_slot_limit CHECK (units / items_per_batch <= slots),
  CONSTRAINT bulk_capacity_limit CHECK (items_per_batch * units <= maximum)
);

CREATE TABLE warehouse_count_conversions (
  id integer PRIMARY KEY,
  units smallint,
  recorded integer,
  archived bigint,
  CONSTRAINT recorded_unit_count CHECK (units::integer = recorded),
  CONSTRAINT archived_unit_count CHECK (units::bigint = archived),
  CONSTRAINT archived_integer_count CHECK (recorded::bigint = archived)
);

CREATE TABLE compact_stock_corrections (
  id integer PRIMARY KEY,
  adjustment integer,
  compact_adjustment smallint,
  skip_conversion boolean,
  CONSTRAINT compact_correction CHECK (
    CASE WHEN skip_conversion THEN true ELSE adjustment::smallint = compact_adjustment END
  )
);

CREATE DOMAIN inventory_adjustment AS bigint;
CREATE DOMAIN warehouse_adjustment AS inventory_adjustment;

CREATE TABLE compact_inventory_adjustments (
  id integer PRIMARY KEY,
  adjustment warehouse_adjustment,
  recorded integer,
  skip_conversion boolean,
  CONSTRAINT compact_adjustment CHECK (
    CASE WHEN skip_conversion THEN true ELSE adjustment::integer = recorded END
  )
);

CREATE TABLE tiny_inventory_adjustments (
  id integer PRIMARY KEY,
  adjustment warehouse_adjustment,
  recorded smallint,
  skip_conversion boolean,
  CONSTRAINT tiny_adjustment CHECK (
    CASE WHEN skip_conversion THEN true ELSE adjustment::smallint = recorded END
  )
);

CREATE TABLE bulk_stock_reconciliations (
  id integer PRIMARY KEY,
  received warehouse_adjustment,
  returned bigint,
  dispatched bigint,
  available bigint,
  CONSTRAINT bulk_stock_balance CHECK (received + returned - dispatched = available)
);

CREATE TABLE bulk_warehouse_corrections (
  id integer PRIMARY KEY,
  delta warehouse_adjustment,
  reversal bigint,
  magnitude bigint,
  confirmed bigint,
  skip_reversal boolean,
  skip_magnitude boolean,
  CONSTRAINT bulk_correction_reversal CHECK (CASE WHEN skip_reversal THEN true ELSE -delta = reversal END),
  CONSTRAINT bulk_correction_magnitude CHECK (CASE WHEN skip_magnitude THEN true ELSE abs(delta) = magnitude END),
  CONSTRAINT bulk_correction_confirmed CHECK (+delta = confirmed)
);

CREATE TABLE mixed_bulk_adjustments (
  id integer PRIMARY KEY,
  delta warehouse_adjustment,
  small_adjustment smallint,
  integer_adjustment integer,
  small_total bigint,
  integer_total bigint,
  small_residual bigint,
  integer_residual bigint,
  small_balance bigint,
  integer_balance bigint,
  CONSTRAINT bulk_small_total CHECK (delta + small_adjustment = small_total),
  CONSTRAINT small_bulk_total CHECK (small_adjustment + delta = small_total),
  CONSTRAINT bulk_integer_total CHECK (delta + integer_adjustment = integer_total),
  CONSTRAINT integer_bulk_total CHECK (integer_adjustment + delta = integer_total),
  CONSTRAINT bulk_small_residual CHECK (delta - small_adjustment = small_residual),
  CONSTRAINT small_bulk_balance CHECK (small_adjustment - delta = small_balance),
  CONSTRAINT bulk_integer_residual CHECK (delta - integer_adjustment = integer_residual),
  CONSTRAINT integer_bulk_balance CHECK (integer_adjustment - delta = integer_balance)
);
