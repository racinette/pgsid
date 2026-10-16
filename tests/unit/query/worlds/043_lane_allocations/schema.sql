-- @world checks
CREATE DOMAIN lane_slots AS integer[];
CREATE TABLE lane_allocations (
  slots lane_slots,
  standby integer[],
  requested_dimension integer,
  slot_limit integer,
  required_dimensions integer,
  first_slot integer,
  last_slot integer,
  layout text,
  use_standby boolean,
  CONSTRAINT slot_capacity CHECK (cardinality(slots) <= slot_limit),
  CONSTRAINT layout_rank CHECK (array_ndims(slots) IS NOT DISTINCT FROM required_dimensions),
  CONSTRAINT lane_capacity CHECK (array_length(slots, requested_dimension) <= slot_limit),
  CONSTRAINT first_slot_bound CHECK (array_lower(slots, requested_dimension) IS NOT DISTINCT FROM first_slot),
  CONSTRAINT last_slot_bound CHECK (array_upper(slots, requested_dimension) IS NOT DISTINCT FROM last_slot),
  CONSTRAINT layout_bounds CHECK (array_dims(slots) COLLATE "C" IS NOT DISTINCT FROM layout COLLATE "C"),
  CONSTRAINT active_capacity CHECK (cardinality(COALESCE(CASE WHEN use_standby THEN NULL::integer[] ELSE slots END, standby)) <= slot_limit)
);
