-- The control for generated-child-override.sql: `FROM ONLY gen_p` stays in
-- the named relation, whose rows WERE computed with its own formula, so
-- the generation dispatch keeps evaluating a * 2 — total arithmetic over a
-- NOT NULL column — and d keeps its notNull. The same scanInh split the
-- catalog flags and the CHECK lists draw.
SELECT
  g.a,  -- @notNull
  g.d   -- @notNull
FROM ONLY gen_p g
