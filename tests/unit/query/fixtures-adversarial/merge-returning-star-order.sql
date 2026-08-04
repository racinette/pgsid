-- ADVERSARIAL FINDING 10 — rank 2 (shape) producing rank 1 (notNull).
--
-- Falsifying data: `INSERT INTO ck (id, name, val) VALUES (1, 'a', 'b');`
-- Observed: PostgreSQL's RowDescription is
--   [sid, snote, id, name, val, tag]
-- while the engine's column list is
--   [id, name, val, tag, sid, snote]
-- Same ARITY, different ORDER — the failure mode the walk doc names when it
-- says arity is a weak guard. The row is (1, NULL, 1, 'z', 'b', 'g'), so the
-- engine's position 1 (`ck.name`, notNull from the SET) lands on PostgreSQL's
-- `s.snote`, which is NULL: a shape defect that is simultaneously a notNull
-- falsification.
--
-- Suspected mechanism: `buildMergeScope` (nullability-walk.ts) calls
-- `buildDmlScope(stmt.relation, …)` first — pushing the TARGET's visible
-- columns — and then pushes the source's. PostgreSQL expands MERGE's
-- `RETURNING *` SOURCE FIRST, then the target (measured directly:
-- `MERGE INTO tgt USING (VALUES …) s(sid, sname) … RETURNING *` describes
-- [sid, sname, tid, tname, tval]). `UPDATE … FROM` and `DELETE … USING`
-- expand target-first and the engine is right for both, so the defect is
-- MERGE-specific.
--
-- `RETURNING ck.*` (qualified) is unaffected.
MERGE INTO ck USING (SELECT 1 AS sid, NULL::text AS snote) AS s ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET name = 'z'
RETURNING *
-- engine claims, in engine order: id @notNull, name @notNull, val @notNull,
-- tag @nullable, sid @notNull, snote @nullable
-- PostgreSQL's order:            sid,          snote,         id,
--                                name,          val,           tag
