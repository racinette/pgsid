-- The SET-column mask, pinned by a live counterexample: the WHERE proved
-- OLD val non-null, and the statement then writes NULL into it — RETURNING
-- reports the NEW row, so the WHERE guarantee must not survive for SET
-- columns. Without the mask the engine would claim tv notNull and this
-- statement's own rows would falsify it. Non-SET target columns (id) keep
-- the full machinery: old = new for them.
--
-- The mask is still the pin; what changed 2026-08-22 is that the engine can
-- now say the TRUE thing about tv rather than only decline the false one.
-- The written-value map gained a mirror carrying nullness, so a SET of a
-- NULL literal reads alwaysNull. If tv ever goes back to plain @nullable
-- the mirror is gone; if it ever reads @notNull the MASK is gone, which is
-- the unsound direction this fixture was written for.
UPDATE t
SET val = NULL
WHERE t.val = 'x'
RETURNING
  t.val AS tv,   -- @alwaysNull  the SET writes a NULL literal
  t.id AS tid,   -- @notNull
  t.name AS nm   -- @nullable
