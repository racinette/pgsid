-- Assignment into a NOT NULL column rejects NULL when the row is written
-- (mechanism B); assignment into a nullable column of the same row does not.
-- The second binding exercises the NULL that $2's nullable claim permits —
-- and witnesses RETURNING name actually coming back NULL.
-- @args [510, "nm"]
-- @args [511, null]
-- @param 1 notNull
-- @param 2 nullable
INSERT INTO t (id, name, active)
VALUES ($1, $2, true)
RETURNING
  id,    -- @notNull
  name   -- @nullable
