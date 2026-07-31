-- MERGE's conditional arms, executed both ways in a single statement: the
-- two-row literal source sends sid 1 down the MATCHED arm under `sparse`
-- (ck.1 is seeded there) while sid 740 takes NOT MATCHED — and under `empty`
-- both rows insert. $1's notNull is the conditional mechanism-B claim:
-- binding NULL raises where MATCHED fires and is silent where it does not.
--
-- No parameter appears in the SOURCE: a parameter flowing through a source
-- column into a rejecting target raises (pinned in param-mechanism.test.ts)
-- and the collector cannot attribute that flow yet — see "Source value-flow
-- attribution" in docs/deferred-tasks.md.
-- @args ["mv", "mn"]
-- @args ["mw", null]
-- @param 1 notNull
-- @param 2 nullable
-- @unwitnessable 0: merge_action() labels every returned row and never yields NULL; merge_action() is a dedicated MergeSupportFunc node the walk treats conservatively
-- @unwitnessable 4: the engine treats the MERGE source as optional (sound: NOT MATCHED BY SOURCE would null-extend it), but this statement has no such arm, so every returned row carries its source row — merge-returning witnesses the arm that does
MERGE INTO ck USING (VALUES (1), (740)) s(sid) ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET val = $1
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, $2)
RETURNING
  merge_action() AS act,    -- @nullable
  ck.id          AS r_id,   -- @notNull
  ck.name        AS r_nm,   -- @nullable
  ck.val         AS r_val,  -- @notNull
  s.sid          AS r_sid   -- @nullable
