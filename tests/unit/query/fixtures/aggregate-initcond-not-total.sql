-- A non-null INITCOND fixes the EMPTY-input result only: with rows to
-- transition, the result is whatever the transition and final functions
-- produced, and neither is analysable. agg_nullify's transition returns
-- NULL for every row; agg_finalnull's FINALFUNC does — both measured
-- (NULL, NULL) over one t row while the INITCOND rule claimed notNull.
-- Every t row witnesses both.
SELECT
  agg_nullify(t.id)   AS a,   -- @nullable
  agg_finalnull(t.id) AS b    -- @nullable
FROM t
