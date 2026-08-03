-- The joint rejection set, motivating shape: neither $1 nor $2 alone forces
-- COALESCE($1, $2) NULL — each is individually nullable — but both together
-- do, and name refuses NULL, so the pair is one irreducible claim the flat
-- contract cannot carry. The soundness suite witnesses it by binding both
-- NULL (dense has tags id 1) and each member's own nullable claim by
-- binding it NULL alone. name stays notNull in RETURNING: the write either
-- raised or stored a non-null.
-- @args ["alpha-name", "beta-name", 1]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param-reject 1,2
UPDATE tags
SET name = COALESCE($1, $2)
WHERE id = $3
RETURNING
  id,    -- @notNull
  name   -- @notNull
