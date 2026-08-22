-- An always-null claim crosses a subquery/CTE boundary on a bare re-export,
-- and it needs no join-state gate to do it — which is the one place this
-- channel is STRONGER than its notNull mirror rather than weaker.
--
-- For notNull, an OPTIONAL entry destroys the claim: the inner row may be
-- absent and the re-export NULL. Here both arms agree. If the inner column
-- is NULL on every inner row then a matched row re-exports NULL, and an
-- extended row is NULL by extension. So `via_left_join` is proven without
-- promoting anything, and its LEFT JOIN is real — `l.id = s.id` matches
-- nothing under the empty and sparse states.
--
-- Still open, deliberately and measurably: the OUTER-filter form,
-- `SELECT q.arrived_at FROM (SELECT arrived_at, status FROM guest) q
--  WHERE q.status = 'in-flight'`, where the evidence is outside the boundary
-- and the CHECK is inside it. That one needs the origin path
-- (`originCheckEntailment`), which reaches the base table through rowPaths
-- and rename maps; asking it the mirror goal is a refactor, not a call.
WITH c AS (SELECT id, arrived_at FROM guest WHERE status = 'in-flight')
SELECT
  s.arrived_at AS via_subquery,  -- @alwaysNull
  c.arrived_at AS via_cte,       -- @alwaysNull
  l.arrived_at AS via_left_join  -- @alwaysNull  extension only adds NULLs
FROM (SELECT id, arrived_at FROM guest WHERE status = 'in-flight') s
CROSS JOIN c
LEFT JOIN (SELECT id, arrived_at FROM guest WHERE status = 'in-flight') l
  ON l.id = s.id
