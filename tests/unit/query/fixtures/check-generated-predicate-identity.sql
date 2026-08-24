-- The shortest route to the same conclusion: the WHERE predicate IS the
-- first arm's guard, so the kernel proves it by atom identity — no
-- anchor order, no evaluated comparison. The first arm always fires and
-- yields the literal 'yes'.
--
-- The sibling that needs the whole machinery is
-- check-generated-predicate-equality.sql; this one is what shows the
-- guard-TRUE consumer is a consumer and not a wrapper around the
-- interval rungs.
SELECT
  c -- @notNull
FROM gpc
WHERE a <= 3
