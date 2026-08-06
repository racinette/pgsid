-- Tuple routing through a TWO-LEVEL partition tree fires the GRANDCHILD's
-- BEFORE ROW trigger.
--
-- The statement names part_p; the row's id routes it into part_2, which is
-- itself partitioned, and on into part_2a — whose trigger nulls the written
-- `k` (measured: the insert says 'kept' and the stored row reads NULL). So
-- `writeRewritesTree` has to union the hooks over the whole SUBTREE, not over
-- immediate children: part_p's own beforeRow is empty and part_2's is too, and
-- the only trigger in the tree is two levels down.
--
-- Every other partition and inheritance tree in this schema is ONE level deep,
-- so until part_2 existed the recursion behind writeRewritesTree, notNullTree,
-- resolveGenerationExprTree and resolveForeignKeyTree never left its base case.
-- This is the fixture that separates them.
--
-- `k` is the discriminating claim: a non-null literal is written, so without
-- the hook the walk would read it back as notNull. With it, the written-value
-- map is void and `k` is nullable — witnessed on every returned row.
INSERT INTO part_p (id, k) VALUES (120, 'kept')
RETURNING
  id,  -- @notNull
  k    -- @nullable
