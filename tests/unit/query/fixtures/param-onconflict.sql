-- The conditional rejection site, executed both ways: $3 flows into ck.val
-- (NOT NULL) only when the DO UPDATE arm fires. Under `sparse` (ck.1 seeded)
-- the first binding conflicts and the arm runs — binding NULL for $3 raises
-- there, which is the witness the notNull claim needs. Under `empty` the
-- insert path runs and $3 is never evaluated; the claim stays existential,
-- exactly like every mechanism-B claim. $1 is the unconditional B site
-- (PRIMARY KEY, checked whenever the VALUES row is built).
--
-- The second binding avoids the seed key so the insert path also returns a
-- row under sparse, and writes a NULL name to keep that column witnessed.
-- @args [1, "nm", "cv"]
-- @args [720, null, "cw"]
-- @param 1 notNull
-- @param 2 nullable
-- @param 3 notNull
INSERT INTO ck (id, name)
VALUES ($1, $2)
ON CONFLICT (id) DO UPDATE SET val = $3, name = excluded.name
RETURNING
  id,    -- @notNull
  name,  -- @nullable
  val    -- @notNull
