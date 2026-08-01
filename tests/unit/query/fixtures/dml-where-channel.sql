-- The DML WHERE channel: every RETURNING row is an affected row, which
-- passed the WHERE — and RETURNING cannot contain aggregates, so the
-- zero-input hazard behind rowsImplyWhere does not exist here. The strict
-- `t.val = $1` conjunct narrows the projected parameter and promotes the
-- USING-relation column (old = new for a relation the statement never
-- writes). The argument stays nullable: the [null] binding deletes nothing
-- and returns cleanly.
-- @args ["x"]
-- @args [null]
-- @param 1 nullable
DELETE FROM v
USING t
WHERE v.u_id = t.id AND t.val = $1
RETURNING
  v.amount AS am,   -- @nullable
  t.val AS tv,      -- @notNull
  $1 AS echo        -- @notNull
