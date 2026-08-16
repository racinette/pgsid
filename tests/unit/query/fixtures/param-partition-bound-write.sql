-- The write-side partition-bound rung in the corpus
-- (docs/subtree-evaluation.md, "Write-side rung"): naming a partition
-- directly makes its bound an enforced constraint on the written row, and
-- daily_metrics_q1's bound opens with `day IS NOT NULL` — the key column is
-- deliberately not declared NOT NULL, so the claim comes from the bound and
-- nowhere else. Binding NULL is unroutable and the direct insert rejects it.
--
-- Same story as param-check-grounded: the raise reads "violates partition
-- constraint", so this claim became witnessable only with the widened
-- witness class (2026-08-16).
-- @args ["2024-02-15"]
-- @param 1 notNull
INSERT INTO daily_metrics_q1 (day, v)
VALUES ($1, 5)
RETURNING
  daily_metrics_q1.day AS r_day, -- @notNull
  daily_metrics_q1.v   AS r_v    -- @notNull
