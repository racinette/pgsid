-- The written row is built entirely from bindings, and the generated column is
-- read back out of RETURNING rather than supplied.
INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING
  id,
  billable_km,
  destination
