-- The UPDATE CTE exports directional images into an immutable movement
-- INSERT. Old notes remain optional; new notes are selected by the SET value.
-- A jointly absent note rejects only when an approved adjustment reaches the
-- consumer, while the same binding succeeds for an absent batch.
-- @args [1, "COUNT-A", "cycle count", "inventory fallback", "2026-09-05T10:00:00Z"]
-- @args [1, "MISSING", null, null, "2026-09-05T10:05:00Z"]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param 4 nullable
-- @param 5 notNull
-- @null-groups none
-- @param-reject 3,4
WITH adjusted AS (
  UPDATE stock_lots AS l
  SET on_hand = l.on_hand + a.quantity_delta,
      count_note = coalesce($3::text, $4::text),
      counted_by = a.actor_label
  FROM stock_adjustments AS a
  WHERE a.tenant_id = l.tenant_id
    AND a.lot_id = l.lot_id
    AND a.tenant_id = $1
    AND a.batch_code = $2
    AND a.approved
    AND l.state = 'available'
  RETURNING WITH (OLD AS before, NEW AS after)
    a.adjustment_id,
    before.tenant_id,
    before.lot_id,
    before.on_hand AS before_qty,
    after.on_hand AS after_qty,
    a.actor_label,
    before.count_note AS previous_note,
    after.count_note AS current_note
)
INSERT INTO movement_events
  (tenant_id, event_id, lot_id, before_qty, after_qty, actor_label,
   previous_note, current_note, happened_at)
SELECT
  a.tenant_id,
  1000 + a.adjustment_id,
  a.lot_id,
  a.before_qty,
  a.after_qty,
  a.actor_label,
  a.previous_note,
  a.current_note,
  $5
FROM adjusted AS a
RETURNING WITH (OLD AS absent, NEW AS recorded)
  absent.event_id,          -- @alwaysNull
  recorded.event_id,        -- @notNull
  recorded.before_qty,      -- @notNull
  recorded.after_qty,       -- @notNull
  recorded.previous_note,   -- @nullable
  recorded.current_note,    -- @notNull
  recorded.movement_class   -- @notNull
