-- Aggregate view + CTE + correlated subquery + multi-join.
-- The order_summary view has nullable columns (sum can be NULL over zero rows).
-- A CTE wraps it; a correlated subquery in the SELECT list references the
-- outer query. Multiple joins combine required and optional sides.
--
-- ot's columns are a presence group, and BOTH are discriminants: given the
-- unit present, the given-present computation recurses CTE → view → the
-- aggregate analysis, where GROUP BY emits no empty groups and the summed
-- operands are NOT NULL — so count(*) AND sum() are non-null exactly when
-- a joined row exists.
-- @null-group 2*,3*
WITH order_totals AS (
  SELECT * FROM order_summary
)
SELECT
  c.id           AS customer_id,   -- @notNull
  c.email        AS email,         -- @notNull
  ot.item_count  AS item_count,    -- @nullable
  ot.total       AS total,         -- @nullable
  (SELECT count(*)
   FROM orders o2
   WHERE o2.customer_id = c.id
     AND o2.status = 'shipped') AS shipped_orders  -- @notNull
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
LEFT JOIN order_totals ot ON ot.order_id = o.id
WHERE c.deleted_at IS NULL
