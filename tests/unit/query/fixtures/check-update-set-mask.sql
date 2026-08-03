-- The DML SET mask over CHECK entailment, pinned by a live counterexample —
-- the CHECK analogue of update-set-mask.sql, with the twist that entailment
-- consumes evidence about columns OTHER than the one it resolves: the WHERE
-- proved the OLD row's status 'housed', the statement then moves the row to
-- an arm whose CHECK forces arrived_at NULL. Combining the OLD-row
-- discriminator with the NEW-row CHECK would claim tv notNull, and this
-- statement's own rows would falsify it — tv is the NEW-channel mask's pin.
--
-- room is the OLD channel (Wave 7): its value is not written, so the
-- returned value IS the OLD one, and against the OLD row the WHERE needs no
-- mask — the OLD row's own CHECK forced room non-null. One statement, both
-- channels, opposite conclusions, each sound.
UPDATE guest
SET arrived_at = NULL, status = 'in-flight'
WHERE status = 'housed'
RETURNING
  arrived_at AS tv,   -- @nullable
  room,               -- @notNull
  id                  -- @notNull
