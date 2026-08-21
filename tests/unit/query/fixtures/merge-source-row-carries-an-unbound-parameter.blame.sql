-- BLAME FILE for `merge-source-row-carries-an-unbound-parameter` in
-- tests/unit/query/generated/generated-soundness.test.ts (the plain/r_snm
-- bucket). See body-parameter-by-name-is-untyped.blame.sql for what a blame
-- file is.
--
-- The rule used to blame the engine treating a MERGE source as optional
-- unconditionally. Measured: it does not. With no NOT MATCHED BY SOURCE arm
-- the source's joinState is REQUIRED and a source column keeps whatever
-- nullability it arrived with — `r_sid` here is a literal and reads notNull,
-- which is that fact executed. Add a BY SOURCE arm and the same column goes
-- nullable (merge-returning.sql pins that side).
--
-- What is actually left unwitnessed is a source row carrying an UNBOUND
-- PARAMETER: `r_snm` is `$1`, nullable because a parameter is, and no data
-- witnesses it because the corpus's shape lands that value in a NOT NULL
-- column, so binding NULL raises instead of returning a row. Here the INSERT
-- arm writes a literal into `ck.name` instead, which keeps the NULL binding
-- safe and the claim honest.
--
-- `r_sid` flipping to nullable would mean the source became unconditionally
-- optional after all — the world the old reason described.
-- @args [null]
-- @param 1 nullable
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record.
MERGE INTO ck USING (VALUES (905, $1::text)) AS s(sid, snm)
ON ck.id = s.sid
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, 'blame')
RETURNING
  s.sid AS r_sid,  -- @notNull   literal, and the source is REQUIRED
  s.snm AS r_snm   -- @nullable  an unbound parameter
