-- The OTHER direction of foreign-key cloning, and the one that says the
-- discriminator is not "is this a clone".
--
-- PostgreSQL clones a key for two different reasons. When the REFERENCED table
-- is partitioned it makes one clone per TARGET partition, each with a
-- different `confrelid` — those disagree about where the match lives and none
-- may be read (`fk-clone-partitioned-referenced.sql`). When the REFERENCING
-- table is partitioned it makes one clone per SOURCE partition, all sharing
-- the declared target, and each is simply that partition's copy of the key.
--
-- `sw4_rs1` names a partition directly, so the ONLY key it carries is a clone:
-- the declared row sits on `sw4_rs`, a different relation. Skipping clones
-- outright — the first version of the finding-4 fix — cost this promotion,
-- soundly but for nothing. Measured before and after.
--
-- The rule that answers both is "prefer the DECLARED key for this column, and
-- fall back to a clone only when there is none". This fixture is the fallback
-- arm; its sibling is the arm where a declared key exists and the clones are
-- ignored.
--
-- @planner-keeps 1: the join settles by foreign-key entailment over the
--   partition's own clone of the key; the planner does not reason from
--   keys.
SELECT
  t.id AS tid   -- @notNull   (the partition's own copy of the key)
FROM sw4_rs1 s
LEFT JOIN sw4_rt t ON t.id = s.t_id
