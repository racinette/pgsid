-- AND-concatenated CHECK (guest_status_note): notFALSE distributes over AND,
-- so the one constraint contributes its two conjuncts as independent facts
-- with no authoring convention required. The second conjunct is the
-- implication shape again, discharged by the WHERE.
SELECT
  note,        -- @notNull
  arrived_at   -- @alwaysNull  'checked-out' takes the CASE's ELSE arm too
FROM guest
WHERE status = 'checked-out'
