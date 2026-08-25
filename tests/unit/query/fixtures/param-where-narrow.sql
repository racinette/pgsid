-- WHERE-conjunct narrowing: every returned row passed `val = $1`, a strict
-- comparison that is only TRUE with $1 non-null — so the projections of $1
-- are @notNull while the ARGUMENT stays nullable: NULL is a perfectly legal
-- binding (the second @args line) that simply returns no rows. The third
-- column is the column-side promotion the engine already had; the parameter
-- side is its mirror.
-- @args ["x"]
-- @args [null]
-- @param 1 nullable
SELECT
  $1 AS c1,         -- @notNull
  $1 || '?' AS c2,  -- @notNull
  val AS c3         -- @notNull
FROM t
WHERE val = $1
