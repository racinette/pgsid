-- The two chartered rungs COMPOSED (docs/subtree-evaluation.md; both
-- landed 2026-08-16): a date-range partition's bound renders its anchors
-- as ISO-shaped date casts — ((day IS NOT NULL) AND (day >=
-- '2024-01-01'::date) AND (day < '2024-04-01'::date)), measured — which
-- the value-shape gate admits, so the bound feeds and date anchors order
-- on a direct partition scan. This is the charter's demand rationale made
-- corpus: an archival query pinned to one quarter of a metrics log. `day`
-- is NOT declared NOT NULL — its notNull IS the bound's prefix claim.
-- The generator's first row (2024-03-15) fires both nullable arms; the
-- ambiguous '3/1/2024' fails the shape test and the session's own Mar-1
-- reading witnesses its NULL.
SELECT
  m.day AS day_notnull,                                                    -- @notNull
  CASE WHEN m.day >= '2024-07-01' THEN NULL ELSE 5 END AS ray_gap,         -- @notNull
  CASE WHEN m.day >= '2024-04-01' THEN NULL ELSE 5 END AS ray_adjacent,    -- @notNull
  CASE WHEN m.day < '2024-01-01'  THEN NULL ELSE 5 END AS below_lower,     -- @notNull
  CASE WHEN m.day >= '2024-02-01' THEN NULL ELSE 5 END AS overlap_kept,    -- @nullable
  CASE WHEN m.day >= '3/1/2024'   THEN NULL ELSE 5 END AS ambiguous_refused -- @nullable
FROM daily_metrics_q1 m
