-- Closed sublinks (docs/subtree-evaluation.md, "Closed sublinks"; landed
-- 2026-08-16): a sublink whose body references no tables, columns or
-- parameters is a closed tree wearing subquery syntax and batches like any
-- scalar. Tier by tier: (SELECT 7) = 7 answers unconditionally; the small
-- generated series admits through the runtime cardinality pre-probe; the
-- unbounded EXISTS needs no probe (the first row answers it, pinned at
-- 10^10). The guards hold the refusals AS refusals: the over-cap body's
-- membership is in fact TRUE — every row fires the NULL arm, which is the
-- witness that refusing must not be mistaken for FALSE — and the
-- correlated body is the no-query-context wall itself, TRUE per row over
-- the NOT NULL key.
SELECT
  CASE WHEN (SELECT 7) = 7 THEN t.id ELSE NULL END AS closed_expr,     -- @notNull
  CASE WHEN 5 IN (SELECT generate_series(1, 8))
       THEN t.id ELSE NULL END AS srf_probed,                          -- @notNull
  CASE WHEN EXISTS (SELECT generate_series(1, 10000000000))
       THEN t.id ELSE NULL END AS exists_lazy,                         -- @notNull
  CASE WHEN 5 IN (SELECT generate_series(1, 2000))
       THEN NULL ELSE 5 END AS overcap_kept,                           -- @nullable
  CASE WHEN (SELECT t.id) = t.id THEN NULL ELSE 5 END AS correlated_kept -- @nullable
FROM order_events_early t
