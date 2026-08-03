-- The motivating shape, negative half: proving the CASE's ELSE arm would
-- need literal distinctness ('in-flight' differs from 'arrived'), which is
-- unsound to conclude syntactically — so the engine leaves arrived_at
-- nullable, which here is also the truth: the same CHECK forces it NULL on
-- every in-flight row, so every returned row witnesses the claim.
SELECT
  id,          -- @notNull
  arrived_at   -- @nullable
FROM guest
WHERE status = 'in-flight'
