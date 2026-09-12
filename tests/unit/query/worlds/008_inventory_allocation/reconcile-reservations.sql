-- Reservation 1 updates, reservation 3 inserts, and source-absent reservation
-- 2 deletes. Old, new, and source therefore have distinct absence arms. The
-- nullable source note is written on UPDATE without becoming a new-image fact.
-- @args [1, "reconciler"]
-- @param 1 notNull
-- @param 2 notNull
-- @null-group 1*,2*,7
-- @null-group 3*,4*,8
-- @null-group 5*,6,9
-- @param-rejections none
MERGE INTO reservations AS r
USING (VALUES
  ($1::int, 1, 500, 100, 3, $2::text, NULL::text),
  ($1::int, 3, 500, 101, 2, $2::text, 'new allocation'::text)
) AS incoming
  (tenant_id, reservation_id, request_id, lot_id, reserved_qty, actor_label,
   reservation_note)
ON r.tenant_id = incoming.tenant_id
 AND r.reservation_id = incoming.reservation_id
WHEN MATCHED THEN
  UPDATE SET reserved_qty = incoming.reserved_qty,
             actor_label = incoming.actor_label,
             reservation_note = incoming.reservation_note,
             state = 'confirmed'
WHEN NOT MATCHED BY TARGET THEN
  INSERT
    (tenant_id, reservation_id, request_id, lot_id, reserved_qty, state,
     actor_label, reservation_note)
  VALUES
    (incoming.tenant_id, incoming.reservation_id, incoming.request_id,
     incoming.lot_id, incoming.reserved_qty, 'pending', incoming.actor_label,
     incoming.reservation_note)
WHEN NOT MATCHED BY SOURCE AND r.tenant_id = $1 AND r.state = 'pending' THEN
  DELETE
RETURNING WITH (OLD AS before, NEW AS after)
  merge_action(),              -- @notNull
  before.reservation_id,       -- @nullable
  before.actor_label,          -- @nullable
  after.reservation_id,        -- @nullable
  after.actor_label,           -- @nullable
  incoming.reservation_id,     -- @nullable
  incoming.actor_label,        -- @nullable
  before.reservation_note,     -- @nullable
  after.reservation_note,      -- @nullable
  incoming.reservation_note    -- @nullable
