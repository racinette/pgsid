-- INNER ON conjuncts are row-implied predicates: every inner-join row passed
-- the qual, so the strict `u.email = $1` narrows the projected $1 — while
-- the ARGUMENT stays nullable (NULL is a legal binding returning zero rows,
-- which the [null] binding verifies). The formerly recorded not-taken
-- extension, taken.
-- @args ["u1@b.c"]
-- @args [null]
-- @param 1 nullable
SELECT
  u.email AS em,   -- @notNull
  $1 AS echo,      -- @notNull
  t.name AS nm     -- @nullable
FROM t JOIN u ON u.t_id = t.id AND u.email = $1
