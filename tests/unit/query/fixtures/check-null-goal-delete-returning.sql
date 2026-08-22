-- The always-null channel reaches DML RETURNING, and this is the shape that
-- proves it did: a DELETE's WHERE is row-implied evidence exactly as a
-- SELECT's is, and the row RETURNING reports is the stored row the CHECKs
-- bound. So 'in-flight' takes the guest CHECK's ELSE arm and arrived_at is
-- NULL on every returned row.
--
-- It also records how the gap was found, because the shape of the miss is
-- the interesting part. The channel had been wired into the TRACED
-- RETURNING assembly and not the untraced one, so `inferNullability` — the
-- function every consumer calls — quietly did not compute the flag here at
-- all, while the traced twin did. No test could see it: the two assemblies
-- are checked for agreement on `notNull`, and the annotation gate only ever
-- ran the untraced path, so both sides of the parity were blind in the same
-- direction. A probe against PostgreSQL found it in one line — the engine
-- said nullable where DELETE returned [null, null].
--
-- `id` is the control that keeps this fixture honest about the direction:
-- the same statement, the same evidence, a column the CHECKs pin non-null.
DELETE FROM guest
WHERE status = 'in-flight'
RETURNING
  id,          -- @notNull
  arrived_at   -- @alwaysNull  the ELSE arm, on the row DELETE reports
