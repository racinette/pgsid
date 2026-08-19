-- The register's quarantined counterexample, shipped as the trigger fixture
-- together with the fix (source value-flow attribution): $1 flows through
-- the source column s.sid into ck.id's PRIMARY KEY, so binding NULL raises —
-- the NULL source row matches nothing and the INSERT arm receives it. $2
-- shows two boundaries at once: name accepts NULL, and the MATCHED arm's
-- use is COALESCE-guarded, so the same flow rejects nothing.
-- @args [745, "sv"]
-- @args [746, null]
-- @param 1 notNull
-- @param 2 nullable
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record.
MERGE INTO ck USING (VALUES ($1::int, $2)) s(sid, snm) ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET val = COALESCE(s.snm, 'd')
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, s.snm)
RETURNING
  ck.id   AS r_id,  -- @notNull
  ck.name AS r_nm   -- @nullable
