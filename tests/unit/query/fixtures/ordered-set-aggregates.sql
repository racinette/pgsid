-- Ordered-set aggregates with the WITHIN GROUP sort expression visible
-- (measured 2026-08-01): non-empty group + non-null sort input + non-null
-- direct args → notNull; a nullable sort column can be all-NULL within a
-- group (NULL inputs are discarded before the computation), so med_val
-- stays nullable and sparse's all-NULL u.val group witnesses it. The
-- hypothetical-set family is TOTAL: rank() WITHIN GROUP returns the
-- hypothetical row's position even over zero rows and for NULL arguments.
SELECT
  u.t_id AS key,                                                      -- @notNull
  percentile_disc(0.5) WITHIN GROUP (ORDER BY u.email) AS med_email,  -- @notNull
  mode() WITHIN GROUP (ORDER BY u.email) AS mode_email,               -- @notNull
  percentile_disc(0.5) WITHIN GROUP (ORDER BY u.val) AS med_val,      -- @nullable
  rank('a') WITHIN GROUP (ORDER BY u.val) AS hyp_rank                 -- @notNull
FROM u
GROUP BY u.t_id
