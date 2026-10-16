INSERT INTO lane_allocations (slots, standby, requested_dimension, slot_limit, required_dimensions, first_slot, last_slot, layout, use_standby)
VALUES ('[0:2]={10,NULL,30}'::integer[], NULL, 1, 3, 1, 0, 2, '[0:2]', false);
