-- The hazard the capture fix makes LIVE, which is why the two had to land
-- together — sweep-4 finding 4, second half.
--
-- A PARTITIONED table holds none of its own rows: they all live in the
-- partitions. So `ONLY sw4_pp` scans nothing, every referencing row
-- NULL-extends, and the key — which promises a match in the TREE — is silent
-- about that slice.
--
-- Before the capture fix the engine was accidentally safe here, because the
-- same bug had already destroyed the declared key. Recovering the key without
-- this gate would have turned an imprecision into a new rank-1: a half-landed
-- version of finding 4 is worse than none of it.
--
-- The gate reads the scan mode of the REFERENCED relation, which nothing did
-- before — `keyedRelation` carried `scansTree` for the referencing side alone.
-- Its counterpart is `fk-entail-only-inheritance-referenced.sql`, where ONLY
-- is exactly where the match lives.
SELECT
  p.id AS pid   -- @nullable  (ONLY a partitioned parent scans no rows)
FROM sw4_pref r
LEFT JOIN ONLY sw4_pp p ON p.id = r.p_id
