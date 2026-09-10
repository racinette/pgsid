-- A SET target and a predicate, so the two bindings are rejected for different
-- reasons: one by the constraint that compares it, one by the key it matches.
-- @args [150, 1]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
UPDATE shipments
SET billed_kg = $1
WHERE id = $2
RETURNING
  id,        -- @notNull
  billed_kg, -- @nullable
  status     -- @notNull
