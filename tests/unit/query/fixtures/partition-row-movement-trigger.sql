-- The hook question crosses commands under row movement (adversarial-2
-- finding 1): an UPDATE through a partitioned parent that moves a row is
-- DELETE + INSERT, and the DESTINATION partition's BEFORE **INSERT**
-- trigger rewrites NEW (measured — mv_2's trigger nulls the written a).
-- mv_p's tree beforeRow is {"insert"}, so the old per-command test
-- `has("update")` saw nothing; a partitioned target's UPDATE now asks
-- `beforeRow ∩ {update, insert}` (updateBeforeRowHazard), voiding the
-- written map — a's written 'x' drops to nullable, witnessed on every
-- moved row — while catalog flags survive (the stored row still passes
-- the parent's constraints, which partitions provably carry). Plain
-- inheritance never routes and keeps the per-command test.
UPDATE mv_p SET id = id + 100, a = 'x' WHERE id < 100
RETURNING
  id,  -- @notNull
  a,   -- @nullable
  b    -- @notNull
