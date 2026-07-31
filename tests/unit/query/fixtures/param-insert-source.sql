-- The INSERT ... SELECT twin of param-merge-source: the identical
-- attribution through a derived table's column, no MERGE involved.
-- @args [750, "iv"]
-- @args [751, null]
-- @param 1 notNull
-- @param 2 nullable
INSERT INTO t (id, name, active)
SELECT s.x, s.y, true
FROM (VALUES ($1::int, $2)) s(x, y)
RETURNING
  id,    -- @notNull
  name   -- @nullable
