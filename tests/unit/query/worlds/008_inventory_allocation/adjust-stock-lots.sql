-- Both row images exist for each UPDATE result. The old count note can be
-- NULL, while the selected SET value makes the new note present. Two approved
-- candidates can match lot 100, so the candidate-specific note remains
-- nullable rather than borrowing the non-NULL value from one candidate.
-- @args [1, "COUNT-A"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
UPDATE stock_lots AS l
SET on_hand = l.on_hand + a.quantity_delta,
    count_note = coalesce(a.adjustment_note, 'bulk count'),
    counted_by = a.actor_label,
    expires_at = a.proposed_expires_at
FROM stock_adjustments AS a
WHERE a.tenant_id = l.tenant_id
  AND a.lot_id = l.lot_id
  AND a.tenant_id = $1
  AND a.batch_code = $2
  AND a.approved
  AND l.state = 'available'
RETURNING WITH (OLD AS before, NEW AS after)
  before.lot_id,               -- @notNull
  before.count_note,           -- @nullable
  after.count_note,            -- @notNull
  before.counted_by,           -- @nullable
  after.counted_by,            -- @notNull
  before.expires_at,           -- @nullable
  after.expires_at,            -- @nullable
  before.depleted_at,          -- @alwaysNull
  after.depleted_at,           -- @alwaysNull
  before.availability_marker,  -- @notNull
  after.availability_marker    -- @notNull
