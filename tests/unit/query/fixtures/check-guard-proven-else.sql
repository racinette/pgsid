-- A PROVEN guard makes the ELSE unreachable, read on the alwaysNull side
-- (always-null-red.test.ts describe F, graduated 2026-08-25). The WHERE
-- IS the guard, so the first arm fires on every emitted row and its NULL
-- is the only value the CASE can take — the ELSE's non-null 'x' is what
-- the rule used to stop on, having no way to say a branch never runs.
--
-- `t` carries no CHECK, so the fact comes off the EVIDENCE-ONLY kernel
-- run: TRUE(active) from the WHERE, matched against the guard atom by
-- identity, with nothing derived from the catalog at all.
SELECT
  CASE WHEN active THEN NULL ELSE 'x' END AS only_the_arm -- @alwaysNull
FROM t
WHERE active
