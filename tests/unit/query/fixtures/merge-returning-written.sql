-- The recorded MERGE bound of the Wave-3 written-value tracking, held as a
-- live trap: EVERY row-producing arm writes a literal into name — MATCHED
-- updates it to 'upd', NOT MATCHED inserts 'ins' — so RETURNING name is
-- provably never NULL, but the engine reports the catalog (nullable). The
-- per-arm intersection was judged not worth building (see the
-- known-imprecisions row in docs/deferred-tasks.md); if it ever lands, this
-- claim flips notNull, the annotation below turns invalid, and the suite
-- forces this file to acknowledge the closure. The source groups by t.id
-- because MERGE refuses a source acting on a target row twice and fuzzed
-- states can duplicate t.id.
-- @unwitnessable 1: every arm writes a literal, but MERGE is outside the written-value tracking — RETURNING name keeps the catalog's nullability (deliberate bound, known-imprecisions table)
MERGE INTO ck
USING (SELECT t.id AS sid FROM t GROUP BY t.id) s ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET name = 'upd'
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, 'ins')
RETURNING
  ck.id AS c1,   -- @notNull
  ck.name AS c2  -- @nullable
