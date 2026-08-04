-- The dup-name hazard through a CTE reference: CTEs export duplicate
-- names exactly like subqueries, and `j.*` must resolve them
-- positionally too. Claims identical to the subquery pins — the
-- shipments unit lifts as {0,2}, g.a stays out.
-- @null-group 0*,2*
WITH j AS (
  SELECT
    sh.id,          -- @nullable
    g.a AS id,      -- @nullable
    sh.carrier      -- @nullable
  FROM orders o
  LEFT JOIN shipments sh ON sh.order_id = o.id
  LEFT JOIN gm g ON g.a = o.id
)
SELECT j.* FROM j
