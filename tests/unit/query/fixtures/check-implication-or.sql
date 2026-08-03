-- Implication spelled as OR (guest_housed_room): TRUE(status = 'housed')
-- falsifies `status <> 'housed'` by the builtin negator pairing — no literal
-- values compared — leaving `room IS NOT NULL` the OR's only live disjunct,
-- hence notFALSE, hence TRUE by totality.
SELECT
  room,   -- @notNull
  note    -- @nullable
FROM guest
WHERE status = 'housed'
