-- The motivating shape, negative half: proving the CASE's ELSE arm would
-- need literal distinctness ('in-flight' differs from 'arrived'), which is
-- unsound to conclude syntactically — so the engine leaves arrived_at
-- nullable, which here is also the truth: the same CHECK forces it NULL on
-- every in-flight row, so every returned row witnesses the claim.
--
-- That last sentence stood as prose for months, describing a fact the
-- engine could not state. It states it now (2026-08-22): the ELSE arm's
-- `arrived_at IS NULL` was always in the kernel's fact set — the harvest
-- records a NullTest of either polarity, since a NullTest is total — and
-- only the final question was single-polarity. Nothing new is derived;
-- `checkConstraintsProveNull` asks the mirror of it.
SELECT
  id,          -- @notNull
  arrived_at   -- @alwaysNull  the ELSE arm, read off the same facts
FROM guest
WHERE status = 'in-flight'
