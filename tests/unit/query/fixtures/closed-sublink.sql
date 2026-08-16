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
--
-- Body-clause widening, first clause (landed 2026-08-16): a SET OPERATION
-- over two closed arms is closed too — UNION's deduplication is what keeps
-- the EXPR body single-row here. Its guard is the wall again, one level
-- deeper: a correlated ARM keeps the whole body open, and t.id is in the
-- membership on every row, so the NULL arm fires and witnesses it.
SELECT
  CASE WHEN (SELECT 7) = 7 THEN t.id ELSE NULL END AS closed_expr,     -- @notNull
  CASE WHEN (SELECT 1 UNION SELECT 1) = 1
       THEN t.id ELSE NULL END AS setop_expr,                          -- @notNull
  CASE WHEN 5 IN (SELECT 5 UNION SELECT 6)
       THEN t.id ELSE NULL END AS setop_membership,                    -- @notNull
  CASE WHEN t.id IN (SELECT t.id UNION SELECT 9)
       THEN NULL ELSE 5 END AS setop_correlated_kept,                  -- @nullable
  -- Second clause (landed 2026-08-16): a LIMIT bounds what the runtime
  -- pre-probe returns, so a LIMITed SRF body answers; an OFFSET bounds
  -- nothing the probe must walk, so an SRF body carrying one is refused —
  -- and refused is not FALSE: the membership below is TRUE, so the NULL
  -- arm fires on every row and witnesses the refusal.
  CASE WHEN (SELECT generate_series(1,5) LIMIT 1) = 1
       THEN t.id ELSE NULL END AS limit_bounded_srf,                   -- @notNull
  CASE WHEN 4 IN (SELECT generate_series(1,8) LIMIT 1 OFFSET 3)
       THEN NULL ELSE 5 END AS srf_offset_kept,                        -- @nullable
  -- Third clause (landed 2026-08-16): a VALUES body is a list of closed
  -- rows — PostgreSQL forbids set-returning calls there, so no pre-probe
  -- is involved. Its control is the wall once more: an element naming the
  -- scope keeps the body open, and t.id is in the list on every row.
  CASE WHEN 2 IN (VALUES (1),(2))
       THEN t.id ELSE NULL END AS values_membership,                   -- @notNull
  CASE WHEN t.id IN (VALUES (t.id))
       THEN NULL ELSE 5 END AS values_correlated_kept,                 -- @nullable
  CASE WHEN 5 IN (SELECT generate_series(1, 8))
       THEN t.id ELSE NULL END AS srf_probed,                          -- @notNull
  CASE WHEN EXISTS (SELECT generate_series(1, 10000000000))
       THEN t.id ELSE NULL END AS exists_lazy,                         -- @notNull
  CASE WHEN 5 IN (SELECT generate_series(1, 2000))
       THEN NULL ELSE 5 END AS overcap_kept,                           -- @nullable
  CASE WHEN (SELECT t.id) = t.id THEN NULL ELSE 5 END AS correlated_kept -- @nullable
FROM order_events_early t
