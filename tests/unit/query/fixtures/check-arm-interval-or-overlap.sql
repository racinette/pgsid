-- One escaping disjunct forfeits the whole OR-fact: a >= 2 admits the
-- a = 2 row — ELSE arm, o IS NULL enforced — so nothing licenses the
-- arm, however snugly the OTHER disjunct fits. EVERY arm must land.
SELECT
  o -- @nullable
FROM cai
WHERE a >= 4 OR a >= 2
