-- The convalidated=false negative, witnessable rendering: guest_vip_reason
-- is a goal-deriving CHECK (vip_reason IS NOT NULL) that is NOT ENFORCED,
-- so stored rows violate it freely and the engine must not consume it —
-- convalidated=false is measured to cover NOT ENFORCED. sparse guest 2 is
-- housed with a NULL vip_reason: the witness that consuming it would be
-- unsound, not merely imprecise.
SELECT
  vip_reason,   -- @nullable
  room          -- @notNull
FROM guest
WHERE status = 'housed'
