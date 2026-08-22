-- Extreme fixture: INSERT...SELECT from a CTE chain with complex RETURNING.
--
-- Tests: DML with CTEs that reference each other, INSERT...SELECT from a
-- multi-join query, RETURNING with expressions referencing the target table,
-- scalar subqueries in RETURNING, COALESCE in RETURNING, strict function
-- in RETURNING, and domain NOT NULL function in RETURNING.
--
-- The query inserts new shipment records for orders that have been
-- fulfilled but not yet shipped. The CTE chain: eligible_orders filters
-- orders, order_details joins with items and products to compute totals,
-- and the INSERT uses the CTE result. RETURNING computes shipping labels,
-- tracking info, and order summaries.
WITH eligible_orders AS (
  SELECT
    o.id AS order_id,
    o.customer_id,
    o.status,
    o.placed_at,
    c.email AS customer_email,
    c.name AS customer_name
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.status = 'fulfilled'
  AND o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM shipments s
    WHERE s.order_id = o.id
    AND s.shipped_at IS NOT NULL
  )
),

order_details AS (
  SELECT
    eo.order_id,
    eo.customer_id,
    eo.status,
    eo.placed_at,
    eo.customer_email,
    eo.customer_name,
    count(oi.id) AS item_count,
    COALESCE(sum(oi.quantity * oi.unit_price), 0) AS order_total,
    COALESCE(sum(oi.quantity), 0) AS total_units,
    max(oi.unit_price) AS max_unit_price,
    min(oi.unit_price) AS min_unit_price,
    (
      SELECT string_agg(DISTINCT p.name, ', ')
      FROM order_items oi2
      JOIN products p ON p.id = oi2.product_id
      WHERE oi2.order_id = eo.order_id
    ) AS product_names
  FROM eligible_orders eo
  LEFT JOIN order_items oi ON oi.order_id = eo.order_id
  GROUP BY eo.order_id, eo.customer_id, eo.status, eo.placed_at,
           eo.customer_email, eo.customer_name
),

shipment_data AS (
  SELECT
    od.order_id,
    od.order_total,
    CASE
      WHEN od.order_total > 500 THEN 'PRIORITY'
      WHEN od.order_total > 100 THEN 'EXPRESS'
      ELSE 'STANDARD'
    END AS service_level,
    COALESCE(
      (SELECT s2.carrier
       FROM shipments s2
       JOIN orders o2 ON o2.id = s2.order_id
       JOIN customers c2 ON c2.id = o2.customer_id
       WHERE c2.id = od.customer_id
       ORDER BY s2.shipped_at DESC
       LIMIT 1),
      'UPS'
    ) AS preferred_carrier
  FROM order_details od
)

INSERT INTO shipments (order_id, carrier, tracking_no)
SELECT
  sd.order_id,
  sd.preferred_carrier,
  NULL
FROM shipment_data sd
RETURNING
  id                                         AS shipment_id,      -- @notNull
  order_id                                   AS order_id,         -- @notNull
  carrier                                    AS carrier,          -- @notNull
  tracking_no                                AS tracking_no,      -- @alwaysNull  written NULL
  COALESCE(tracking_no, 'PENDING')           AS safe_tracking,    -- @notNull
  shipped_at                                 AS shipped_at,       -- @nullable
  delivered_at                               AS delivered_at,     -- @nullable
  lower_strict(carrier)                      AS lower_carrier,    -- @notNull
  always_text(carrier)                       AS guaranteed_carrier,  -- @notNull
  (
    SELECT c.email
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = shipments.order_id
  )                                          AS customer_email,   -- @notNull
  (
    SELECT COALESCE(sum(oi.quantity * oi.unit_price), 0)
    FROM order_items oi
    WHERE oi.order_id = shipments.order_id
  )                                          AS order_total,      -- @notNull
  (
    SELECT count(*)
    FROM order_items oi
    WHERE oi.order_id = shipments.order_id
  )                                          AS item_count,       -- @notNull
  CASE
    WHEN (
      SELECT COALESCE(sum(oi.quantity * oi.unit_price), 0)
      FROM order_items oi
      WHERE oi.order_id = shipments.order_id
    ) > 500 THEN 'PRIORITY'
    ELSE 'STANDARD'
  END                                        AS service_level,    -- @notNull
  COALESCE(
    (SELECT c.name FROM customers c
     JOIN orders o ON o.id = shipments.order_id
     WHERE c.id = o.customer_id),
    'Unknown'
  )                                          AS customer_name,    -- @notNull
  ROW(
    id,
    order_id,
    carrier,
    COALESCE(tracking_no, 'N/A')
  )                                          AS shipment_row      -- @notNull
