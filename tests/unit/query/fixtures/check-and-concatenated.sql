-- AND-concatenated CHECK (guest_status_note): notFALSE distributes over AND,
-- so the one constraint contributes its two conjuncts as independent facts
-- with no authoring convention required. The second conjunct is the
-- implication shape again, discharged by the WHERE.
SELECT
  note,        -- @notNull
  arrived_at   -- @nullable
FROM guest
WHERE status = 'checked-out'
