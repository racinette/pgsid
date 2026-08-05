-- FINDING 1 (rank 1) — the hook lookup asks about the STATEMENT's command,
-- while row movement crosses commands. An UPDATE through a partitioned
-- parent that moves a row to another partition is performed as DELETE +
-- INSERT, so the DESTINATION partition's BEFORE **INSERT** trigger fires
-- and may replace NEW wholesale (measured). `writeRewritesTree` unions
-- beforeRow over the subtree — mv_p's tree beforeRow is {"insert"} — but
-- buildUpdateScope asks `wr.beforeRow.has("update")`, which is false, so
-- the written-value map stands and `a = 'x'` is claimed notNull.
--
-- Falsifying data: INSERT INTO mv_p VALUES (1, 'orig', 'bb') — the row
-- lands in mv_1; the UPDATE moves it to mv_2.
-- Observed: [101, NULL, 'bb'] — mv_2's BEFORE INSERT trigger nulled a.
-- Mechanism: nullability-walk.ts buildUpdateScope / buildMergeScope, the
-- command test against catalog-adapter resolveWriteRewritesTree; the tree
-- union collapses the command dimension of its members but the query it
-- answers is still per-command.
--
-- The claims below are the engine's CURRENT ones. `a` is the falsified one.
UPDATE mv_p SET id = id + 100, a = 'x' WHERE id = 1
RETURNING
  id,  -- @notNull
  a,   -- @notNull  <-- FALSIFIED (NULL on the routed row)
  b    -- @notNull
