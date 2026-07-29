-- Extreme fixture: recursive category tree with aggregated product metrics,
-- coupon discounts, and shipment status — all combined in a single query.
--
-- Tests: recursive CTE, multiple CTEs referencing each other, LEFT JOINs
-- with WHERE promotion, scalar subqueries with aggregates, COALESCE with
-- strict functions, domain NOT NULL columns, window functions over the
-- recursive result, and correlated subqueries in CASE conditions.
--
-- The recursive CTE builds a category tree with depth tracking. A second
-- CTE aggregates product data per category. A third CTE joins with coupons
-- and shipments. The outer query combines everything with window functions
-- and CASE expressions.
WITH RECURSIVE cat_tree AS (
  SELECT
    c.id,
    c.parent_id,
    c.slug,
    c.name,
    0 AS depth
  FROM categories c
  WHERE c.parent_id IS NULL
  AND c.deleted_at IS NULL

  UNION ALL

  SELECT
    c.id,
    c.parent_id,
    c.slug,
    c.name,
    ct.depth + 1
  FROM categories c
  JOIN cat_tree ct ON c.parent_id = ct.id
  WHERE c.deleted_at IS NULL
),

category_products AS (
  SELECT
    p.category_id,
    count(*) AS product_count,
    COALESCE(sum(p.price), 0) AS total_value,
    COALESCE(avg(p.price), 0) AS avg_price,
    max(p.price) AS max_price,
    min(p.price) AS min_price
  FROM products p
  WHERE p.deleted_at IS NULL
  GROUP BY p.category_id
),

category_stats AS (
  SELECT
    ct.id,
    ct.parent_id,
    ct.slug,
    ct.name,
    ct.depth,
    COALESCE(cp.product_count, 0) AS product_count,
    COALESCE(cp.total_value, 0) AS total_value,
    COALESCE(cp.avg_price, 0) AS avg_price,
    cp.max_price,
    cp.min_price,
    (
      SELECT count(DISTINCT r.customer_id)
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      WHERE p.category_id = ct.id
    ) AS reviewer_count,
    (
      SELECT count(*)
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.category_id = ct.id
      AND s.delivered_at IS NOT NULL
    ) AS shipped_count
  FROM cat_tree ct
  LEFT JOIN category_products cp ON cp.category_id = ct.id
)

SELECT
  cs.id                                    AS category_id,      -- @notNull
  cs.parent_id                             AS parent_id,         -- @nullable
  cs.slug                                  AS slug,              -- @notNull
  cs.name                                  AS name,              -- @notNull
  cs.depth                                 AS depth,             -- @nullable
  cs.product_count                         AS product_count,     -- @notNull
  cs.total_value                           AS total_value,       -- @notNull
  cs.avg_price                             AS avg_price,         -- @notNull
  COALESCE(cs.max_price, 0)                AS safe_max_price,    -- @notNull
  COALESCE(cs.min_price, 0)                AS safe_min_price,    -- @notNull
  cs.reviewer_count                        AS reviewer_count,    -- @notNull
  cs.shipped_count                         AS shipped_count,     -- @notNull
  lower_strict(cs.name)                    AS lower_name,        -- @notNull
  COALESCE(lower_strict(cs.slug), 'none')  AS safe_slug,         -- @notNull
  rank() OVER (ORDER BY cs.product_count DESC) AS popularity_rank,  -- @notNull
  count(*) OVER ()                         AS total_categories,  -- @notNull
  CASE
    WHEN cs.product_count > 10 THEN 'large'
    WHEN cs.product_count > 0 THEN 'small'
    ELSE 'empty'
  END                                      AS size_category,    -- @notNull
  COALESCE(
    always_text(cs.name),
    'unnamed'
  )                                        AS guaranteed_name,  -- @notNull
  (
    SELECT count(*)
    FROM cat_tree ct2
    WHERE ct2.parent_id = cs.id
  )                                        AS child_count       -- @notNull
FROM category_stats cs
WHERE cs.product_count > 0
ORDER BY cs.depth, cs.product_count DESC
