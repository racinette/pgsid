-- The gate on the reachability rule: a proven guard silences what comes
-- AFTER it and nothing before it. `name IS NULL` is not refuted, so it
-- may fire first and yield 'z' — and it does, on every row whose name
-- the null policy erased. A rule that read "some guard is proven" as
-- "the CASE is that arm" would claim this @alwaysNull, and PostgreSQL
-- hands back 'z' to say otherwise.
SELECT
  CASE WHEN name IS NULL THEN 'z' WHEN active THEN NULL ELSE 'x' END AS earlier_arm_lives -- @nullable
FROM t
WHERE active
