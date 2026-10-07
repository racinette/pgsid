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

CREATE TABLE bulk_package_products (
  id integer PRIMARY KEY,
  units warehouse_adjustment,
  packages bigint,
  total bigint,
  skip_product boolean,
  CONSTRAINT bulk_package_product CHECK (CASE WHEN skip_product THEN true ELSE units * packages = total END)
);

CREATE TABLE bulk_package_divisions (
  id integer PRIMARY KEY,
  units warehouse_adjustment,
  batch_size bigint,
  batches bigint,
  loose_units bigint,
  skip_division boolean,
  skip_remainder boolean,
  CONSTRAINT bulk_package_quotient CHECK (CASE WHEN skip_division THEN true ELSE units / batch_size = batches END),
  CONSTRAINT bulk_package_remainder CHECK (CASE WHEN skip_remainder THEN true ELSE units % batch_size = loose_units END)
);

CREATE TABLE mixed_bulk_packages (
  id integer PRIMARY KEY,
  units warehouse_adjustment,
  small_batch smallint,
  integer_batch integer,
  small_total bigint,
  integer_total bigint,
  bulk_small_batches bigint,
  small_bulk_batches bigint,
  bulk_integer_batches bigint,
  integer_bulk_batches bigint,
  skip_products boolean,
  skip_divisions boolean,
  CONSTRAINT bulk_small_product CHECK (CASE WHEN skip_products THEN true ELSE units * small_batch = small_total END),
  CONSTRAINT small_bulk_product CHECK (CASE WHEN skip_products THEN true ELSE small_batch * units = small_total END),
  CONSTRAINT bulk_integer_product CHECK (CASE WHEN skip_products THEN true ELSE units * integer_batch = integer_total END),
  CONSTRAINT integer_bulk_product CHECK (CASE WHEN skip_products THEN true ELSE integer_batch * units = integer_total END),
  CONSTRAINT bulk_small_quotient CHECK (CASE WHEN skip_divisions THEN true ELSE units / small_batch = bulk_small_batches END),
  CONSTRAINT small_bulk_quotient CHECK (CASE WHEN skip_divisions THEN true ELSE small_batch / units = small_bulk_batches END),
  CONSTRAINT bulk_integer_quotient CHECK (CASE WHEN skip_divisions THEN true ELSE units / integer_batch = bulk_integer_batches END),
  CONSTRAINT integer_bulk_quotient CHECK (CASE WHEN skip_divisions THEN true ELSE integer_batch / units = integer_bulk_batches END)
);

CREATE TABLE mixed_batch_remainders (
  id integer PRIMARY KEY,
  small_units smallint,
  integer_units integer,
  big_units warehouse_adjustment,
  small_integer_loose integer,
  integer_small_loose integer,
  small_big_loose bigint,
  big_small_loose bigint,
  integer_big_loose bigint,
  big_integer_loose bigint,
  literal_small_loose integer,
  literal_big_loose bigint,
  call_loose bigint,
  skip_remainders boolean,
  CONSTRAINT small_integer_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE small_units % integer_units = small_integer_loose END),
  CONSTRAINT integer_small_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE integer_units % small_units = integer_small_loose END),
  CONSTRAINT small_big_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE small_units % big_units = small_big_loose END),
  CONSTRAINT big_small_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE big_units % small_units = big_small_loose END),
  CONSTRAINT integer_big_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE integer_units % big_units = integer_big_loose END),
  CONSTRAINT big_integer_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE big_units % integer_units = big_integer_loose END),
  CONSTRAINT small_literal_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE small_units % 2 = literal_small_loose END),
  CONSTRAINT big_literal_remainder CHECK (CASE WHEN skip_remainders THEN true ELSE big_units % 3 = literal_big_loose END),
  CONSTRAINT widened_remainder_call CHECK (CASE WHEN skip_remainders THEN true ELSE pg_catalog.int8mod(small_units, integer_units) = call_loose END)
);

CREATE TABLE chosen_package_counts (
  id integer PRIMARY KEY,
  small_units smallint,
  integer_units integer,
  big_units warehouse_adjustment,
  use_small boolean,
  use_integer boolean,
  recorded_pair integer,
  recorded_stock bigint,
  recorded_baseline integer,
  recorded_double bigint,
  recorded_ratio bigint,
  recorded_nested bigint,
  recorded_simple bigint,
  CONSTRAINT chosen_pair CHECK ((CASE WHEN use_small THEN small_units ELSE integer_units END) = recorded_pair),
  CONSTRAINT chosen_stock CHECK ((CASE WHEN use_small THEN small_units WHEN use_integer THEN integer_units ELSE big_units END) = recorded_stock),
  CONSTRAINT chosen_baseline CHECK ((CASE WHEN use_small THEN small_units ELSE 0 END) = recorded_baseline),
  CONSTRAINT chosen_double CHECK ((CASE WHEN use_small THEN small_units + small_units ELSE big_units END) = recorded_double),
  CONSTRAINT chosen_ratio CHECK ((CASE WHEN use_small THEN small_units / integer_units ELSE big_units END) = recorded_ratio),
  CONSTRAINT chosen_nested CHECK ((CASE WHEN use_small THEN CASE WHEN use_integer THEN small_units ELSE integer_units END ELSE big_units END) = recorded_nested),
  CONSTRAINT chosen_simple CHECK ((CASE use_small WHEN true THEN small_units WHEN false THEN integer_units ELSE big_units END) = recorded_simple),
  CONSTRAINT chosen_without_else CHECK ((CASE WHEN use_small THEN small_units END) = recorded_pair)
);

CREATE TABLE stock_count_comparisons (
  id integer PRIMARY KEY,
  small_count smallint, ordinary_count integer, bulk_count bigint,
  small_baseline smallint, ordinary_baseline integer, bulk_baseline bigint,
  small_difference integer, recorded_order integer,
  largest_small smallint, smallest_small smallint,
  largest_ordinary integer, smallest_ordinary integer,
  largest_bulk bigint, smallest_bulk bigint,
  CONSTRAINT compare_small_counts CHECK (btint2cmp(small_count, small_baseline) = small_difference),
  CONSTRAINT compare_ordinary_counts CHECK (btint4cmp(ordinary_count, ordinary_baseline) = recorded_order),
  CONSTRAINT compare_bulk_counts CHECK (btint8cmp(bulk_count, bulk_baseline) = recorded_order),
  CONSTRAINT compare_small_ordinary CHECK (btint24cmp(small_count, ordinary_baseline) = recorded_order),
  CONSTRAINT compare_small_bulk CHECK (btint28cmp(small_count, bulk_baseline) = recorded_order),
  CONSTRAINT compare_ordinary_small CHECK (btint42cmp(ordinary_count, small_baseline) = recorded_order),
  CONSTRAINT compare_ordinary_bulk CHECK (btint48cmp(ordinary_count, bulk_baseline) = recorded_order),
  CONSTRAINT compare_bulk_small CHECK (btint82cmp(bulk_count, small_baseline) = recorded_order),
  CONSTRAINT compare_bulk_ordinary CHECK (btint84cmp(bulk_count, ordinary_baseline) = recorded_order),
  CONSTRAINT largest_small_count CHECK (int2larger(small_count, small_baseline) = largest_small),
  CONSTRAINT smallest_small_count CHECK (int2smaller(small_count, small_baseline) = smallest_small),
  CONSTRAINT largest_ordinary_count CHECK (int4larger(ordinary_count, ordinary_baseline) = largest_ordinary),
  CONSTRAINT smallest_ordinary_count CHECK (int4smaller(ordinary_count, ordinary_baseline) = smallest_ordinary),
  CONSTRAINT largest_bulk_count CHECK (int8larger(bulk_count, bulk_baseline) = largest_bulk),
  CONSTRAINT smallest_bulk_count CHECK (int8smaller(bulk_count, bulk_baseline) = smallest_bulk)
);

CREATE TABLE stock_integer_masks (
  id integer PRIMARY KEY,
  small_bits smallint, ordinary_bits integer, bulk_bits bigint,
  small_mask smallint, ordinary_mask integer, bulk_mask bigint,
  shift_distance integer,
  small_intersection smallint, ordinary_intersection integer, bulk_intersection bigint,
  small_union smallint, ordinary_union integer, bulk_union bigint,
  small_difference smallint, ordinary_difference integer, bulk_difference bigint,
  small_complement smallint, ordinary_complement integer, bulk_complement bigint,
  small_shift_left smallint, ordinary_shift_left integer, bulk_shift_left bigint,
  small_shift_right smallint, ordinary_shift_right integer, bulk_shift_right bigint,
  CONSTRAINT small_mask_intersection CHECK ((small_bits & small_mask) = small_intersection),
  CONSTRAINT ordinary_mask_intersection CHECK ((ordinary_bits & ordinary_mask) = ordinary_intersection),
  CONSTRAINT bulk_mask_intersection CHECK ((bulk_bits & bulk_mask) = bulk_intersection),
  CONSTRAINT small_mask_union CHECK ((small_bits | small_mask) = small_union),
  CONSTRAINT ordinary_mask_union CHECK ((ordinary_bits | ordinary_mask) = ordinary_union),
  CONSTRAINT bulk_mask_union CHECK ((bulk_bits | bulk_mask) = bulk_union),
  CONSTRAINT small_mask_difference CHECK ((small_bits # small_mask) = small_difference),
  CONSTRAINT ordinary_mask_difference CHECK ((ordinary_bits # ordinary_mask) = ordinary_difference),
  CONSTRAINT bulk_mask_difference CHECK ((bulk_bits # bulk_mask) = bulk_difference),
  CONSTRAINT small_mask_complement CHECK ((~small_bits) = small_complement),
  CONSTRAINT ordinary_mask_complement CHECK ((~ordinary_bits) = ordinary_complement),
  CONSTRAINT bulk_mask_complement CHECK ((~bulk_bits) = bulk_complement),
  CONSTRAINT small_mask_shift_left CHECK ((small_bits << shift_distance) = small_shift_left),
  CONSTRAINT ordinary_mask_shift_left CHECK ((ordinary_bits << shift_distance) = ordinary_shift_left),
  CONSTRAINT bulk_mask_shift_left CHECK ((bulk_bits << shift_distance) = bulk_shift_left),
  CONSTRAINT small_mask_shift_right CHECK ((small_bits >> shift_distance) = small_shift_right),
  CONSTRAINT ordinary_mask_shift_right CHECK ((ordinary_bits >> shift_distance) = ordinary_shift_right),
  CONSTRAINT bulk_mask_shift_right CHECK ((bulk_bits >> shift_distance) = bulk_shift_right)
);

CREATE TABLE stock_count_math (
  id integer PRIMARY KEY,
  ordinary_count integer, ordinary_batch integer, bulk_count bigint, bulk_batch bigint,
  ordinary_divisor integer, bulk_divisor bigint,
  ordinary_multiple integer, bulk_multiple bigint,
  ordinary_remainder integer, bulk_remainder bigint,
  ordinary_next integer, bulk_next bigint, bulk_previous bigint,
  ordinary_absolute integer, ordinary_positive integer, ordinary_negative integer,
  skip_calculation boolean,
  CONSTRAINT ordinary_common_divisor CHECK (CASE WHEN skip_calculation THEN true ELSE gcd(ordinary_count, ordinary_batch) = ordinary_divisor END),
  CONSTRAINT bulk_common_divisor CHECK (CASE WHEN skip_calculation THEN true ELSE gcd(bulk_count, bulk_batch) = bulk_divisor END),
  CONSTRAINT ordinary_common_multiple CHECK (CASE WHEN skip_calculation THEN true ELSE lcm(ordinary_count, ordinary_batch) = ordinary_multiple END),
  CONSTRAINT bulk_common_multiple CHECK (CASE WHEN skip_calculation THEN true ELSE lcm(bulk_count, bulk_batch) = bulk_multiple END),
  CONSTRAINT ordinary_modulo_call CHECK (CASE WHEN skip_calculation THEN true ELSE mod(ordinary_count, ordinary_batch) = ordinary_remainder END),
  CONSTRAINT bulk_modulo_call CHECK (CASE WHEN skip_calculation THEN true ELSE mod(bulk_count, bulk_batch) = bulk_remainder END),
  CONSTRAINT ordinary_increment_call CHECK (CASE WHEN skip_calculation THEN true ELSE int4inc(ordinary_count) = ordinary_next END),
  CONSTRAINT bulk_increment_call CHECK (CASE WHEN skip_calculation THEN true ELSE int8inc(bulk_count) = bulk_next END),
  CONSTRAINT bulk_decrement_call CHECK (CASE WHEN skip_calculation THEN true ELSE int8dec(bulk_count) = bulk_previous END),
  CONSTRAINT ordinary_absolute_call CHECK (CASE WHEN skip_calculation THEN true ELSE int4abs(ordinary_count) = ordinary_absolute END),
  CONSTRAINT ordinary_positive_call CHECK (CASE WHEN skip_calculation THEN true ELSE int4up(ordinary_count) = ordinary_positive END),
  CONSTRAINT ordinary_negative_call CHECK (CASE WHEN skip_calculation THEN true ELSE int4um(ordinary_count) = ordinary_negative END)
);

CREATE TABLE stock_window_bounds (
  id integer PRIMARY KEY,
  small_count smallint, ordinary_count integer, bulk_count bigint,
  small_baseline smallint, ordinary_baseline integer, bulk_baseline bigint,
  small_offset smallint, ordinary_offset integer, bulk_offset bigint,
  subtract_offset boolean, preceding boolean, inside_window boolean,
  CONSTRAINT small_window_small_offset CHECK (in_range(small_count, small_baseline, small_offset, subtract_offset, preceding) = inside_window),
  CONSTRAINT small_window_ordinary_offset CHECK (in_range(small_count, small_baseline, ordinary_offset, subtract_offset, preceding) = inside_window),
  CONSTRAINT small_window_bulk_offset CHECK (in_range(small_count, small_baseline, bulk_offset, subtract_offset, preceding) = inside_window),
  CONSTRAINT ordinary_window_small_offset CHECK (in_range(ordinary_count, ordinary_baseline, small_offset, subtract_offset, preceding) = inside_window),
  CONSTRAINT ordinary_window_ordinary_offset CHECK (in_range(ordinary_count, ordinary_baseline, ordinary_offset, subtract_offset, preceding) = inside_window),
  CONSTRAINT ordinary_window_bulk_offset CHECK (in_range(ordinary_count, ordinary_baseline, bulk_offset, subtract_offset, preceding) = inside_window),
  CONSTRAINT bulk_window_bulk_offset CHECK (in_range(bulk_count, bulk_baseline, bulk_offset, subtract_offset, preceding) = inside_window)
);

CREATE TABLE stock_boolean_records (
  id integer PRIMARY KEY,
  selected boolean, permitted boolean, numeric_flag integer,
  recorded_flag boolean, recorded_integer integer,
  recorded_both boolean, recorded_either boolean, recorded_order integer,
  CONSTRAINT stock_integer_to_boolean CHECK (pg_catalog.bool(numeric_flag) = recorded_flag),
  CONSTRAINT stock_boolean_to_integer CHECK (pg_catalog.int4(selected) = recorded_integer),
  CONSTRAINT stock_boolean_both CHECK (booland_statefunc(selected, permitted) = recorded_both),
  CONSTRAINT stock_boolean_either CHECK (boolor_statefunc(selected, permitted) = recorded_either),
  CONSTRAINT stock_boolean_order CHECK (btboolcmp(selected, permitted) = recorded_order)
);

CREATE TABLE stock_radix_records (
  id integer PRIMARY KEY,
  ordinary_count integer, bulk_count bigint,
  ordinary_binary text, ordinary_octal text, ordinary_hex text,
  bulk_binary text, bulk_octal text, bulk_hex text,
  display_size text, encoding_number integer, encoding_width integer,
  comparison_kind integer, comparison_strategy smallint,
  CONSTRAINT ordinary_binary_record CHECK (to_bin(ordinary_count) = ordinary_binary),
  CONSTRAINT ordinary_octal_record CHECK (to_oct(ordinary_count) = ordinary_octal),
  CONSTRAINT ordinary_hex_record CHECK (to_hex(ordinary_count) = ordinary_hex),
  CONSTRAINT bulk_binary_record CHECK (to_bin(bulk_count) = bulk_binary),
  CONSTRAINT bulk_octal_record CHECK (to_oct(bulk_count) = bulk_octal),
  CONSTRAINT bulk_hex_record CHECK (to_hex(bulk_count) = bulk_hex),
  CONSTRAINT stock_size_display CHECK (pg_size_pretty(bulk_count) = display_size),
  CONSTRAINT stock_encoding_width CHECK (pg_encoding_max_length(encoding_number) = encoding_width),
  CONSTRAINT stock_comparison_strategy CHECK (gist_translate_cmptype_common(comparison_kind) = comparison_strategy)
);

CREATE TABLE stock_hash_records (
  id integer PRIMARY KEY,
  small_count smallint, ordinary_count integer, bulk_count bigint, selected boolean,
  hash_seed bigint,
  small_hash integer, ordinary_hash integer, bulk_hash integer, boolean_hash integer,
  small_seeded_hash bigint, ordinary_seeded_hash bigint, bulk_seeded_hash bigint, boolean_seeded_hash bigint,
  CONSTRAINT small_count_hash CHECK (hashint2(small_count) = small_hash),
  CONSTRAINT ordinary_count_hash CHECK (hashint4(ordinary_count) = ordinary_hash),
  CONSTRAINT bulk_count_hash CHECK (hashint8(bulk_count) = bulk_hash),
  CONSTRAINT selected_count_hash CHECK (hashbool(selected) = boolean_hash),
  CONSTRAINT small_count_seeded_hash CHECK (hashint2extended(small_count, hash_seed) = small_seeded_hash),
  CONSTRAINT ordinary_count_seeded_hash CHECK (hashint4extended(ordinary_count, hash_seed) = ordinary_seeded_hash),
  CONSTRAINT bulk_count_seeded_hash CHECK (hashint8extended(bulk_count, hash_seed) = bulk_seeded_hash),
  CONSTRAINT selected_count_seeded_hash CHECK (hashboolextended(selected, hash_seed) = boolean_seeded_hash)
);
