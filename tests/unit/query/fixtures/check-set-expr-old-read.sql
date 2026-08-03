-- SET expressions read the OLD row (dmlOldRowRead), where WHERE facts and
-- CHECKs alike hold unmasked: the OLD row was housed, its CHECK forced room
-- non-null, and `note = room` copies that value — so the written note is
-- provably non-null and RETURNING reports it, even though status (the
-- discriminator the evidence rides on) is itself being overwritten. Under
-- the NEW-row mask alone this evidence would be gone; the read-context flag
-- is what keeps it. The NEW row passes every CHECK: in-flight forces
-- arrived_at NULL (written), and constrains neither room nor note.
UPDATE guest
SET status = 'in-flight', arrived_at = NULL, note = room
WHERE status = 'housed'
RETURNING
  note,   -- @notNull
  id      -- @notNull
