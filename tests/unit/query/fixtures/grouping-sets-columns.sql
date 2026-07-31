-- @unwitnessable 3: sum over non-empty groups of a NOT NULL price is always defined; aggregates under GROUPING SETS stay conservative
-- ROLLUP / CUBE / GROUPING SETS NULL out the grouping columns they collapse.
--
-- A super-aggregate row reports NULL for the columns it aggregates over, so a
-- NOT NULL catalog column still comes back NULL there. This is independent of
-- the aggregate side: the row exists, the column is simply blanked.
--
-- Only columns *inside* a grouping-set construct are affected. A plain term
-- alongside one appears in every generated grouping set and survives, which is
-- what `sku` below pins.
SELECT
  p.sku                      AS plain_term,     -- @notNull
  p.id                       AS rolled_up,      -- @nullable
  count(*)                   AS n,              -- @notNull
  sum(p.price)               AS total           -- @nullable
FROM products p
GROUP BY p.sku, ROLLUP(p.id)
