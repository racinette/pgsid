-- The NULL-listing twin claims NOTHING — the rung's refusal, recorded
-- rather than silent: courier_south's bound renders
-- ((region IS NULL) OR (region = 'south')) — no prefix, and the IS NULL
-- arm is outside the point/interval machinery, so membership exclusion
-- refuses the whole fact. The key's nullable is witnessed by the
-- rotation's NULL rows. The outside guard's nullable is the engine's
-- refusal held by annotation: over NULL-or-'south' rows the arm never
-- fires, so no data state can produce the NULL.
-- @unwitnessable 1: no courier_south row satisfies region = 'west', so
--   the arm never fires and no NULL can exist; the nullable word is the
--   engine's REFUSAL (the IS NULL arm blocks membership exclusion),
--   held here by annotation exactly like the collation twin's.
SELECT
  c.region AS key_nullable,                                            -- @nullable
  CASE WHEN c.region = 'west' THEN NULL ELSE 5 END AS outside_kept     -- @nullable
FROM courier_south c
