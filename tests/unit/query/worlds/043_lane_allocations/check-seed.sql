-- name: signed_lane_bounds
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[-2:0]={10,NULL,30}'::integer[], NULL, 1, 3, 1, -2, 0, '[-2:0]', false);
-- name: multidimensional_lanes
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1][-3:-2]={{1,NULL},{3,4}}'::integer[], NULL, 2, 4, 2, -3, -2, '[0:1][-3:-2]', false);
-- name: empty_lane_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{}'::integer[], NULL, 1, 0, NULL, NULL, NULL, NULL, false);
-- name: missing_dimension
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, 2, 2, 1, NULL, NULL, '[1:2]', false);
-- name: negative_dimension
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, -1, 2, 1, NULL, NULL, '[1:2]', false);
-- name: null_dimension
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, NULL, 2, 1, NULL, NULL, '[1:2]', false);
-- name: null_lane_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES (NULL, NULL, 1, 0, NULL, NULL, NULL, NULL, false);
-- name: standby_lane_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES (NULL, '{1,NULL}'::integer[], 1, 2, NULL, NULL, NULL, NULL, false);
-- name: selected_standby_plan
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], '{3}'::integer[], 1, 2, 1, 1, 2, '[1:2]', true);
-- name: slot_capacity_exceeded
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,NULL,3}'::integer[], NULL, 1, 2, 1, 1, 3, '[1:3]', false);
-- name: rank_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,2}'::integer[], NULL, 1, 2, 2, 1, 2, '[1:2]', false);
-- name: lower_bound_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1]={1,2}'::integer[], NULL, 1, 2, 1, 1, 1, '[0:1]', false);
-- name: upper_bound_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1]={1,2}'::integer[], NULL, 1, 2, 1, 0, 2, '[0:1]', false);
-- name: layout_mismatch
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:1]={1,2}'::integer[], NULL, 1, 2, 1, 0, 1, '[1:2]', false);
-- name: standby_capacity_exceeded
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1}'::integer[], '{1,2,3}'::integer[], 1, 1, 1, 1, 1, '[1:1]', true);
-- name: nullable_capacity
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('{1,NULL}'::integer[], NULL, 1, NULL, 1, 1, 2, '[1:2]', false);
-- name: integer_minimum_bound
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[-2147483648:-2147483648]={1}'::integer[], NULL, 1, 1, 1, -2147483648, -2147483648, '[-2147483648:-2147483648]', false);
-- name: integer_maximum_bound
INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[2147483646:2147483646]={1}'::integer[], NULL, 1, 1, 1, 2147483646, 2147483646, '[2147483646:2147483646]', false);
