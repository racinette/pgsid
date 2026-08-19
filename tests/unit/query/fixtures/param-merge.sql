-- MERGE's conditional arms, executed both ways in a single statement: the
-- two-row literal source sends sid 1 down the MATCHED arm under `sparse`
-- (ck.1 is seeded there) while sid 740 takes NOT MATCHED — and under `empty`
-- both rows insert. $1's notNull is the conditional mechanism-B claim:
-- binding NULL raises where MATCHED fires and is silent where it does not.
--
-- The SOURCE here is parameter-free by choice of shape, not necessity:
-- source value-flow attribution covers parameters in sources now — see
-- param-merge-source.sql for the trigger case.
-- @args ["mv", "mn"]
-- @args ["mw", null]
-- @param 1 notNull
-- @param 2 nullable
-- r_sid is notNull since the arm-aware source treatment (Wave 4): only a
-- NOT MATCHED BY SOURCE arm can null-extend the source, and this statement
-- has none — the imprecision the old @unwitnessable note here recorded.
--
-- `act` is notNull because every returned row came from an arm and
-- merge_action() names it; PostgreSQL allows the call nowhere else.
--
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record.
MERGE INTO ck USING (VALUES (1), (740)) s(sid) ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET val = $1
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, $2)
RETURNING
  merge_action() AS act,    -- @notNull
  ck.id          AS r_id,   -- @notNull
  ck.name        AS r_nm,   -- @nullable
  ck.val         AS r_val,  -- @notNull
  s.sid          AS r_sid   -- @notNull
