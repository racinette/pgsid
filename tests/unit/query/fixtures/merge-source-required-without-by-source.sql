-- A MERGE source is REQUIRED when there is no NOT MATCHED BY SOURCE arm.
--
-- This was `merge-source-row-carries-an-unbound-parameter.blame.sql` until
-- 2026-08-22, and it outlived the rule it blamed twice over. The rule first
-- blamed the engine for treating a MERGE source as optional unconditionally;
-- measurement said otherwise, and `r_sid` — a literal, read notNull — is that
-- fact executed. Add a BY SOURCE arm and the same column goes nullable
-- (merge-returning.sql pins that side). Nothing else covers this side, which
-- is why the file stayed when the rule went.
--
-- The rule's SECOND reason then closed too: it said `r_snm` could not be
-- witnessed because binding NULL raises instead of returning a row, and read
-- the other way that is the proof a returned row had a non-NULL binding
-- (`returningRejectedParams`). It does not apply HERE, and deliberately: the
-- INSERT arm writes a literal into `ck.name`, so `$1` reaches no rejecting
-- site, `r_snm` is honestly nullable, and the NULL binding returns a row that
-- witnesses it. param-returning-rejected-merge.sql is the same statement with
-- the parameter routed into `ck.val` instead, where the claim flips.
-- @args [null]
-- @param 1 nullable
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record.
MERGE INTO ck USING (VALUES (905, $1::text)) AS s(sid, snm)
ON ck.id = s.sid
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, 'blame')
RETURNING
  s.sid AS r_sid,  -- @notNull   literal, and the source is REQUIRED
  s.snm AS r_snm   -- @nullable  an unbound parameter, reaching no rejecting site
