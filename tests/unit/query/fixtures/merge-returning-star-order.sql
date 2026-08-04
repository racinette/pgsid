-- MERGE's `RETURNING *` expands the SOURCE first, then the target
-- (measured) — the opposite of UPDATE … FROM and DELETE … USING, which are
-- target-first. buildMergeScope once pushed target-first: same arity,
-- permuted order, which landed ck.name's written-value notNull on the
-- source's NULL snote — the walk doc's standing warning that arity is a
-- weak guard, made real. The soundness suite's ordered name comparison is
-- the oracle here; sparse's ck row 1 matches and witnesses snote and tag.
-- `RETURNING ck.*` resolves through the alias and is unaffected either way.
-- @unwitnessable 5: tag is nn_text — the NOT NULL domain rejects every NULL
-- write, and the engine reads the column nullable anyway (attnotnull stays
-- false for domain constraints — the register's recorded imprecision).
MERGE INTO ck USING (SELECT 1 AS sid, NULL::text AS snote) AS s ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET name = 'z'
RETURNING *
-- PostgreSQL's order — source first, then target:
-- @notNull    (sid: the source literal)
-- @nullable   (snote: the source's NULL::text)
-- @notNull    (id)
-- @notNull    (name: written 'z' by the sole arm)
-- @notNull    (val)
-- @nullable   (tag)
