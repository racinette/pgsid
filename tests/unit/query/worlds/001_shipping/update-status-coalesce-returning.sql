-- Neither status candidate is required alone, but a matching update rejects
-- when both are NULL. This is the argument-side union contract: at least one
-- member of the minimal rejection set must be non-null.
-- @args ["shipped", "draft", 3]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param-reject 1,2
-- @null-groups none
UPDATE shipments
SET status = COALESCE($1, $2)
WHERE id = $3
RETURNING
  id,    -- @notNull
  status -- @notNull
