-- ROLLUP / CUBE / GROUPING SETS NULL out the grouping columns they collapse.
--
-- A super-aggregate row reports NULL for the columns it aggregates over, so a
-- NOT NULL catalog column still comes back NULL there. This is independent of
-- the aggregate side: the row exists, the column is simply blanked.
--
-- Only columns *inside* a grouping-set construct are affected. A plain term
-- alongside one appears in every generated grouping set and survives, which is
-- what `sku` below pins.
--
-- That same plain term also decides the AGGREGATE side, which the gate did not
-- ask until 2026-08-22: it refused every GroupingSet term outright, and `sum`
-- carried "aggregates under GROUPING SETS stay conservative" as its reason.
-- What actually makes an aggregate NULL is an EMPTY generated set — the row
-- `GROUP BY GROUPING SETS (())` emits with no input rows behind it. `p.sku`
-- appears in every set this clause generates, so no generated set is empty and
-- `sum` over a NOT NULL price is defined on every row.
-- grouping-set-bare-rollup-aggregate.sql is the same clause with the plain
-- term taken away, where the grand-total row witnesses the NULL.
SELECT
  p.sku                      AS plain_term,     -- @notNull
  p.id                       AS rolled_up,      -- @nullable
  count(*)                   AS n,              -- @notNull
  sum(p.price)               AS total           -- @notNull
FROM products p
GROUP BY p.sku, ROLLUP(p.id)
