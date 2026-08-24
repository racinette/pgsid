-- A DELETE…RETURNING BODY — "can match zero rows" at the body's verdict site.
--
-- The register measured single-statement DML bodies during the multi-statement
-- work ("UPDATE … RETURNING correctly nullable") and left no fixture behind;
-- the DELETE site was dark (rung-census.test.ts). A delete that matches
-- nothing returns no row, so the scalar call is NULL — and fb_log holds no
-- row matching a fresh u.id in any seeded state, so the NULL is witnessed on
-- every execution.
SELECT
  fb_del(u.id) AS removed,  -- @nullable
  u.id         AS uid       -- @notNull
FROM u
