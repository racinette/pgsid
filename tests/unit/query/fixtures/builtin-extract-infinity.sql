-- @unwitnessable 3: extract(day) of an INTERVAL is the monotone-adjacent
--   field: ±Infinity for infinite input (measured), a number for finite —
--   never NULL. The engine's nullable is name-level conservatism.
-- extract/date_part are one function under two names, and neither is total
-- (adversarial-2 finding 11): for an infinite timestamp, timestamptz, date
-- or interval, PostgreSQL returns ±Infinity for the monotonically-increasing
-- fields (epoch, julian, year, decade, century, millennium) and NULL for
-- every other one — month, day, hour, dow (measured). The first sweep probed
-- the pair with finite inputs only, which is why they survived it. Both are
-- out of STRICT_TOTAL_BUILTINS; the NULLs below are witnessed by inf_t's
-- generated infinity rows, whose COLUMNS are all NOT NULL — the NULL is
-- manufactured by the function, not passed through.
SELECT
  i.id,                              -- @notNull
  extract(month from i.ts) AS m,     -- @nullable  (NULL when ts is infinite)
  date_part('dow', i.ts) AS d,       -- @nullable  (same function by its other name)
  extract(day from i.iv) AS v        -- @nullable  (Infinity, not NULL — see @unwitnessable)
FROM inf_t i
