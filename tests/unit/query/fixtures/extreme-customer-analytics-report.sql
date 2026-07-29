-- Extreme fixture: customer order analytics with multi-level aggregation,
-- address resolution, coupon application, and shipment tracking.
--
-- Tests: nested CTEs with different join structures, scalar subqueries in
-- SELECT list, correlated subqueries in WHERE, multiple LEFT JOINs with
-- per-alias WHERE promotion, COALESCE chains, strict functions, domain
-- NOT NULL columns on optional join sides, window functions with PARTITION,
-- and set operations combining the final result with a summary row.
--
-- The query builds a customer analytics report: for each customer with
-- at least one order, compute order count, total spent, average rating,
-- shipping status, and address info. The result is UNIONed with a
-- summary row containing aggregates across all customers.
WITH customer_orders AS (
  SELECT
    o.id AS order_id,
    o.customer_id,
    o.status,
    o.placed_at,
    o.deleted_at,
    COALESCE(sum(oi.unit_price * oi.quantity) OVER (PARTITION BY o.id), 0) AS order_total,
    count(oi.id) OVER (PARTITION BY o.id) AS item_count,
    (
      SELECT avg(r.rating)
      FROM reviews r
      JOIN order_items oi2 ON oi2.product_id = r.product_id
      WHERE oi2.order_id = o.id
    ) AS avg_rating
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.deleted_at IS NULL
),

customer_totals AS (
  SELECT
    co.customer_id,
    count(DISTINCT co.order_id) AS order_count,
    COALESCE(sum(co.order_total), 0) AS total_spent,
    COALESCE(avg(co.order_total), 0) AS avg_order_value,
    max(co.order_total) AS max_order,
    min(co.order_total) AS min_order,
    max(co.avg_rating) AS best_rating,
    count(*) FILTER (WHERE co.status = 'shipped') AS shipped_orders,
    count(*) FILTER (WHERE co.status = 'pending') AS pending_orders
  FROM customer_orders co
  GROUP BY co.customer_id
),

customer_info AS (
  SELECT
    c.id AS customer_id,
    c.email,
    c.name,
    c.deleted_at,
    a.line1,
    a.line2,
    a.city,
    a.state,
    a.postal_code,
    a.country,
    ct.order_count,
    ct.total_spent,
    ct.avg_order_value,
    ct.max_order,
    ct.min_order,
    ct.best_rating,
    ct.shipped_orders,
    ct.pending_orders,
    (
      SELECT s.carrier
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      WHERE o.customer_id = c.id
      AND s.delivered_at IS NOT NULL
      ORDER BY s.delivered_at DESC
      LIMIT 1
    ) AS last_carrier,
    (
      SELECT s.tracking_no
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      WHERE o.customer_id = c.id
      AND s.delivered_at IS NOT NULL
      ORDER BY s.delivered_at DESC
      LIMIT 1
    ) AS last_tracking_no
  FROM customers c
  LEFT JOIN addresses a ON a.customer_id = c.id AND a.id = (
    SELECT min(a2.id) FROM addresses a2 WHERE a2.customer_id = c.id
  )
  JOIN customer_totals ct ON ct.customer_id = c.id
  WHERE c.deleted_at IS NULL
)

SELECT
  ci.customer_id                           AS customer_id,      -- @notNull
  ci.email                                 AS email,            -- @notNull
  ci.name                                  AS customer_name,    -- @nullable
  COALESCE(ci.name, 'Unknown')             AS safe_name,       -- @notNull
  ci.city                                  AS city,             -- @nullable
  ci.state                                 AS state,            -- @nullable
  ci.postal_code                           AS postal_code,      -- @nullable
  ci.country                               AS country,          -- @nullable
  ci.order_count                           AS order_count,      -- @notNull
  ci.total_spent                           AS total_spent,      -- @notNull
  ci.avg_order_value                       AS avg_order_value,  -- @notNull
  COALESCE(ci.max_order, 0)                AS max_order,        -- @notNull
  COALESCE(ci.min_order, 0)                AS min_order,        -- @notNull
  ci.best_rating                           AS best_rating,      -- @nullable
  ci.shipped_orders                        AS shipped_orders,   -- @nullable
  ci.pending_orders                        AS pending_orders,   -- @nullable
  ci.last_carrier                          AS last_carrier,     -- @nullable
  COALESCE(ci.last_tracking_no, 'N/A')     AS safe_tracking,    -- @notNull
  lower_strict(ci.email)                   AS lower_email,      -- @notNull
  COALESCE(lower_strict(ci.name), 'none')  AS lower_name,       -- @notNull
  always_text(ci.email)                    AS guaranteed_email, -- @notNull
  rank() OVER (ORDER BY ci.total_spent DESC) AS spend_rank,     -- @nullable
  count(*) OVER ()                         AS total_customers,  -- @notNull
  CASE
    WHEN ci.total_spent > 1000 THEN 'premium'
    WHEN ci.total_spent > 100 THEN 'regular'
    ELSE 'occasional'
  END                                      AS tier              -- @nullable
FROM customer_info ci

UNION ALL

SELECT
  0,
  'SUMMARY',
  'All Customers',
  'All Customers',
  NULL,
  NULL,
  NULL,
  NULL,
  count(*),
  COALESCE(sum(ci2.total_spent), 0),
  COALESCE(avg(ci2.total_spent), 0),
  COALESCE(max(ci2.max_order), 0),
  COALESCE(min(ci2.min_order), 0),
  max(ci2.best_rating),
  sum(ci2.shipped_orders),
  sum(ci2.pending_orders),
  NULL,
  'N/A',
  'summary',
  'summary',
  'summary',
  NULL,
  0,
  'all'
FROM customer_info ci2
