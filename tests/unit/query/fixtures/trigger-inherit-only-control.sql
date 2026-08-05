-- The ONLY control: UPDATE ONLY inh_p pins the write to the parent, where
-- no trigger exists — the child's BEFORE UPDATE trigger cannot fire for
-- rows it never receives — so the named relation's own hooks are the
-- right question and the written-value map survives. The written literal
-- is what makes id notNull: the catalog never could (id is unconstrained
-- everywhere in the tree), so this claim discriminates the hook
-- resolution, not just the flags.
UPDATE ONLY inh_p SET id = 5, a = 'set'
RETURNING
  id,  -- @notNull
  a    -- @notNull
