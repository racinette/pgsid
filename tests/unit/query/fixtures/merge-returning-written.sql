-- Formerly the live trap for the MERGE written-value bound; the per-arm
-- intersection landed (Wave 4) and flipped it, exactly as the trap's
-- annotation predicted. EVERY row-producing arm writes a literal into name
-- — MATCHED updates it to 'upd', NOT MATCHED inserts 'ins' — so RETURNING
-- name is notNull whichever arm produced the row. The source groups by
-- t.id because MERGE refuses a source acting on a target row twice and
-- fuzzed states can duplicate t.id.
--
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record —
--   MERGE's arm-aware modelling holds the claims instead.
MERGE INTO ck
USING (SELECT t.id AS sid FROM t GROUP BY t.id) s ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET name = 'upd'
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, 'ins')
RETURNING
  ck.id AS c1,   -- @notNull
  ck.name AS c2  -- @notNull
