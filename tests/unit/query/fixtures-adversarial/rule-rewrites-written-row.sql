-- ADVERSARIAL FINDING 2 (second rendering) — rank 1, notNull unsoundness.
--
-- Falsifying data: none needed.
-- Observed: PostgreSQL returns (1, NULL). The DO INSTEAD rule replaces the
-- statement with an INSERT into `rule_dst`, whose `a` is both nullable in the
-- catalog and written NULL; RETURNING reports the rule's query, not the one
-- written here.
--
-- Suspected mechanism: as trigger-rewrites-written-row.sql — the engine
-- analyses the statement as written. `analyzeInsert` binds the target to
-- `rule_src`, reads its catalog flags (`a` is NOT NULL there) and its written
-- values ('x'), and neither fact survives the rewrite. Rules are not in the
-- catalog snapshot.
INSERT INTO rule_src VALUES (1, 'x')
RETURNING
  id,  -- @notNull
  a    -- @notNull  <-- FALSE: the rule returns rule_dst's NULL
