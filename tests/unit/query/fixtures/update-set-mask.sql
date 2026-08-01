-- The SET-column mask, pinned by a live counterexample: the WHERE proved
-- OLD val non-null, and the statement then writes NULL into it — RETURNING
-- reports the NEW row, so the WHERE guarantee must not survive for SET
-- columns. Without the mask the engine would claim tv notNull and this
-- statement's own rows would falsify it. Non-SET target columns (id) keep
-- the full machinery: old = new for them.
UPDATE t
SET val = NULL
WHERE t.val = 'x'
RETURNING
  t.val AS tv,   -- @nullable
  t.id AS tid,   -- @notNull
  t.name AS nm   -- @nullable
