-- The written row is built entirely from bindings, and the generated column is
-- read back out of RETURNING rather than supplied.
-- @args [10, 1, 3, "Trondheim", null, 20, 1]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 notNull
-- @param 4 notNull
-- @param 5 nullable
-- @param 6 nullable
-- @param 7 nullable
-- @null-groups none
-- @param-rejections none
INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING
  id,          -- @notNull
  billable_km, -- @nullable
  destination  -- @nullable
