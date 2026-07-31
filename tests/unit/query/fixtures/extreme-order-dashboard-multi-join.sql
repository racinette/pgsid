-- @unwitnessable 20: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- @unwitnessable 21: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- @unwitnessable 22: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- @unwitnessable 23: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- @unwitnessable 24: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- @unwitnessable 25: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- @unwitnessable 26: the CROSS JOIN LATERAL drops exactly the orders that would leave this aggregate's LEFT JOIN side unmatched, so it always runs over rows
-- Extreme fixture: multiple join types with nested subqueries, CTEs,
-- LATERAL, window functions, and expression combinations.
--
-- Tests: INNER + LEFT + RIGHT + FULL + CROSS JOIN in a single FROM,
-- LATERAL subquery with correlated reference, per-alias WHERE promotion
-- on multiple aliases, nested subquery in FROM, COALESCE chains, strict
-- functions, domain NOT NULL functions, RowExpr, ARRAY sublink, EXISTS,
-- scalar subqueries with aggregates, and window functions over the
-- multi-join result.
--
-- The query builds a comprehensive order dashboard: for each order, it
-- resolves the customer (with address), the items (with product details),
-- the shipment, applicable coupons, and review summaries. Multiple join
-- types ensure different nullability profiles.

WITH customer_addresses AS (
  SELECT
    c.id AS customer_id,
    c.email,
    c.name AS customer_name,
    c.deleted_at AS customer_deleted,
    a.line1,
    a.line2,
    a.city,
    a.state,
    a.postal_code,
    a.country,
    a.id AS address_id
  FROM customers c
  LEFT JOIN addresses a ON a.customer_id = c.id
  AND a.id = (
    SELECT min(a2.id)
    FROM addresses a2
    WHERE a2.customer_id = c.id
  )
),

order_item_details AS (
  SELECT
    o.id AS order_id,
    oi.id AS item_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total,
    p.name AS product_name,
    p.sku AS product_sku,
    p.price AS list_price,
    p.category_id,
    p.deleted_at AS product_deleted,
    COALESCE(
      (SELECT avg(r.rating) FROM reviews r WHERE r.product_id = p.id),
      0
    ) AS product_avg_rating,
    (
      SELECT count(*)
      FROM reviews r
      WHERE r.product_id = p.id
    ) AS product_review_count
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
),

order_totals AS (
  SELECT
    otd.order_id,
    count(*) AS item_count,
    COALESCE(sum(otd.line_total), 0) AS order_total,
    COALESCE(sum(otd.quantity), 0) AS total_units,
    max(otd.line_total) AS max_line,
    min(otd.line_total) AS min_line,
    COALESCE(avg(otd.unit_price), 0) AS avg_unit_price,
    count(DISTINCT otd.category_id) AS category_count
  FROM order_item_details otd
  GROUP BY otd.order_id
)

SELECT
  o.id                                     AS order_id,         -- @notNull
  o.status                                 AS order_status,     -- @notNull
  o.placed_at                              AS placed_at,        -- @notNull
  o.deleted_at                             AS order_deleted,    -- @nullable
  lower_strict(o.status)                   AS lower_status,     -- @notNull
  COALESCE(lower_strict(o.status), 'x')    AS safe_status,      -- @notNull
  always_text(o.status)                    AS guaranteed_status,  -- @notNull

  ca.customer_id                           AS customer_id,      -- @notNull
  ca.email                                 AS customer_email,   -- @notNull
  ca.customer_name                         AS customer_name,    -- @nullable
  COALESCE(ca.customer_name, 'Unknown')    AS safe_customer_name,  -- @notNull
  lower_strict(ca.email)                   AS lower_email,      -- @notNull
  ca.line1                                 AS address_line1,    -- @nullable
  ca.line2                                 AS address_line2,    -- @nullable
  ca.city                                  AS city,             -- @nullable
  ca.state                                 AS state,            -- @nullable
  ca.postal_code                           AS postal_code,      -- @nullable
  ca.country                               AS country,          -- @nullable
  COALESCE(ca.city, 'Unknown')             AS safe_city,        -- @notNull
  COALESCE(ca.state, 'N/A')                AS safe_state,       -- @notNull

  ot.item_count                            AS item_count,       -- @nullable
  ot.order_total                           AS order_total,      -- @nullable
  ot.total_units                           AS total_units,      -- @nullable
  ot.max_line                              AS max_line,         -- @nullable
  ot.min_line                              AS min_line,         -- @nullable
  ot.avg_unit_price                        AS avg_unit_price,   -- @nullable
  ot.category_count                        AS category_count,   -- @nullable
  COALESCE(ot.item_count, 0)               AS safe_item_count,  -- @notNull
  COALESCE(ot.order_total, 0)              AS safe_order_total, -- @notNull
  COALESCE(ot.total_units, 0)              AS safe_total_units, -- @notNull
  COALESCE(ot.max_line, 0)                 AS safe_max_line,    -- @notNull
  COALESCE(ot.min_line, 0)                 AS safe_min_line,    -- @notNull
  COALESCE(ot.avg_unit_price, 0)           AS safe_avg_price,   -- @notNull
  COALESCE(ot.category_count, 0)           AS safe_cat_count,   -- @notNull

  s.id                                     AS shipment_id,      -- @nullable
  s.carrier                                AS carrier,          -- @nullable
  s.tracking_no                            AS tracking_no,      -- @nullable
  s.shipped_at                             AS shipped_at,       -- @nullable
  s.delivered_at                           AS delivered_at,     -- @nullable
  COALESCE(s.carrier, 'N/A')               AS safe_carrier,     -- @notNull
  COALESCE(s.tracking_no, 'PENDING')       AS safe_tracking,    -- @notNull

  cp.code                                  AS coupon_code,      -- @nullable
  cp.discount_percent                      AS discount,         -- @nullable
  COALESCE(cp.code, 'NONE')                AS safe_coupon,      -- @notNull
  COALESCE(cp.discount_percent, 0)         AS safe_discount,    -- @notNull

  lp.top_product_name                      AS top_product_name, -- @notNull
  lp.top_product_revenue                   AS top_product_revenue,  -- @notNull
  COALESCE(lp.top_product_name, 'N/A')     AS safe_top_product, -- @notNull

  rank() OVER (ORDER BY o.placed_at DESC)  AS recent_rank,      -- @notNull
  rank() OVER (ORDER BY ot.order_total DESC NULLS LAST) AS value_rank,  -- @notNull
  count(*) OVER ()                         AS total_orders,     -- @notNull
  count(*) OVER (PARTITION BY o.status)    AS status_count,     -- @notNull

  CASE
    WHEN ot.order_total > 500 THEN 'large'
    WHEN ot.order_total > 100 THEN 'medium'
    WHEN ot.order_total IS NOT NULL THEN 'small'
    ELSE 'empty'
  END                                      AS order_size,       -- @notNull

  CASE
    WHEN s.delivered_at IS NOT NULL THEN 'delivered'
    WHEN s.shipped_at IS NOT NULL THEN 'in_transit'
    WHEN s.id IS NOT NULL THEN 'pending_shipment'
    ELSE 'not_shipped'
  END                                      AS shipping_status,  -- @notNull

  ROW(
    o.id,
    o.status,
    COALESCE(ot.order_total, 0),
    COALESCE(s.carrier, 'N/A')
  )                                        AS order_summary,    -- @notNull

  ARRAY(
    SELECT oi2.product_name
    FROM order_item_details oi2
    WHERE oi2.order_id = o.id
    ORDER BY oi2.line_total DESC
  )                                        AS product_names,    -- @notNull

  EXISTS (
    SELECT 1 FROM reviews r
    JOIN order_item_details otd2 ON otd2.product_id = r.product_id
    WHERE otd2.order_id = o.id
    AND r.rating = 5
  )                                        AS has_five_star,   -- @notNull

  NOT EXISTS (
    SELECT 1 FROM reviews r
    JOIN order_item_details otd2 ON otd2.product_id = r.product_id
    WHERE otd2.order_id = o.id
    AND r.rating <= 2
  )                                        AS no_low_ratings    -- @notNull

FROM orders o

INNER JOIN customer_addresses ca ON ca.customer_id = o.customer_id

LEFT JOIN order_totals ot ON ot.order_id = o.id

LEFT JOIN shipments s ON s.order_id = o.id

LEFT JOIN coupons cp ON cp.id = (
  SELECT min(c2.id) FROM coupons c2 WHERE c2.expires_at IS NULL OR c2.expires_at > now()
)

CROSS JOIN LATERAL (
  SELECT
    otd.product_name AS top_product_name,
    otd.line_total AS top_product_revenue
  FROM order_item_details otd
  WHERE otd.order_id = o.id
  ORDER BY otd.line_total DESC
  LIMIT 1
) lp

WHERE o.deleted_at IS NULL
  AND ca.customer_id IS NOT NULL
  AND ca.email IS NOT NULL
ORDER BY o.placed_at DESC
