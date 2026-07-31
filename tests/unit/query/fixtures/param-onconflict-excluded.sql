-- excluded IS a derived row: excluded.name is the value this INSERT proposed
-- for name, so $2 flows through it into val's NOT NULL constraint. Spelled
-- EXCLUDED to pin case-folding (the parser lower-cases unquoted identifiers)
-- and wrapped in a strict concat to pin attribution through composition.
-- Conditional like every conflict-arm site: witnessed under sparse (ck.1
-- conflicts), silent on the insert path.
-- @args [1, "en"]
-- @args [760, null]
-- @param 1 notNull
-- @param 2 notNull
INSERT INTO ck (id, name) VALUES ($1, $2)
ON CONFLICT (id) DO UPDATE SET val = EXCLUDED.name || '!'
RETURNING
  id,    -- @notNull
  name,  -- @nullable
  val    -- @notNull
