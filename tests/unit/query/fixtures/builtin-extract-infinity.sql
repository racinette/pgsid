-- extract/date_part are one function under two names, and neither is total
-- (adversarial-2 finding 11): for an infinite timestamp, timestamptz, date or
-- interval, PostgreSQL returns ±Infinity for some fields and NULL for others.
-- The first sweep probed the pair with finite inputs only, which is why they
-- survived it. Both are out of STRICT_TOTAL_BUILTINS.
--
-- The name-level exclusion stood in for a TWO-DIMENSIONAL fact, and this
-- fixture is where the two dimensions come apart. Which fields are total is
-- decided by the field TOGETHER WITH the argument's type, and `day` is the
-- proof: NULL for an infinite timestamp, a number for an infinite interval.
-- An interval's day count grows with the interval, so an infinite one has an
-- infinite day count, where an infinite INSTANT has no day-of-month to report.
-- EXTRACT_TOTAL_FIELDS carries the measured cells; `v` used to be nullable
-- behind a reason that named exactly this.
--
-- The NULLs below are witnessed by inf_t's generated infinity rows, whose
-- COLUMNS are all NOT NULL — the NULL is manufactured by the function, not
-- passed through.
--
-- The two dimensions are separated in both directions, which is what makes
-- either one removable a falsifiable claim rather than a story:
--
--   ONE TYPE, TWO FIELDS — `e` and `m` both read i.ts, and only `e` survives.
--   ONE FIELD, TWO TYPES — `v` and `dt` are both `day`, and only the interval
--     one survives. Drop the type from the lookup and `dt` is claimed notNull
--     on a column PostgreSQL answers NULL for.
SELECT
  i.id,                              -- @notNull
  extract(month from i.ts) AS m,     -- @nullable  (NULL when ts is infinite)
  date_part('dow', i.ts) AS d,       -- @nullable  (same function by its other name)
  extract(day from i.iv) AS v,       -- @notNull   (Infinity, not NULL)
  extract(day from i.ts) AS dt,      -- @nullable  (same field, other type)
  extract(epoch from i.ts) AS e      -- @notNull   (monotone, so ±Infinity)
FROM inf_t i
