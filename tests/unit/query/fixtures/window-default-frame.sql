-- Window aggregates over the DEFAULT frame: RANGE UNBOUNDED PRECEDING TO
-- CURRENT ROW always contains the current row (measured 2026-08-01), so an
-- aggregate that is non-null over non-empty non-null input — and
-- first_value, which picks a row of that same frame — is notNull. Each
-- escape hatch stays nullable and is witnessed at sparse's one-row volume:
-- a nullable argument (u.val is NULL there), a FILTER that can empty the
-- frame, and an explicit frame that excludes the current row.
SELECT
  u.email AS em,                                          -- @notNull
  max(u.email) OVER () AS wmax,                           -- @notNull
  sum(u.id) OVER (PARTITION BY u.t_id) AS wsum,           -- @notNull
  first_value(u.email) OVER (ORDER BY u.id) AS wfirst,    -- @notNull
  max(u.val) OVER () AS wmax_n,                           -- @nullable
  max(u.email) FILTER (WHERE u.id > 999) OVER () AS wfilt, -- @nullable
  max(u.email) OVER (ORDER BY u.id ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING) AS wframe -- @nullable
FROM u
