-- OR promotes by INTERSECTION: a disjunction proves a column non-null only
-- when EVERY arm does — whichever arm made the WHERE TRUE, it was a strict
-- comparison on val, so val was non-null. The negative (an OR with a
-- non-proving arm) is param-optional-filter, whose IS NULL arm keeps the
-- intersection empty.
SELECT
  t.val AS v,    -- @notNull
  t.name AS nm   -- @nullable
FROM t
WHERE t.val = 'x' OR t.val = 'y'
