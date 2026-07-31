-- @unwitnessable 24: data gap: NULL needs an updated product without a category, and every state's updated products carry one
-- Extreme fixture: UPDATE with CTEs, FROM clause, WHERE with correlated
-- subquery, and complex RETURNING expressions.
--
-- Tests: UPDATE...FROM with multiple joined tables, CTE chain feeding the
-- SET expressions, WHERE clause with correlated subquery and EXISTS,
-- RETURNING with scalar subqueries referencing the target table, COALESCE
-- chains, strict functions, domain NOT NULL functions, CASE expressions,
-- and window functions can't be in RETURNING but scalar subqueries can.
--
-- The query updates product prices based on category averages, review
-- ratings, and sales volume. Products that are underpriced relative to
-- their category get a price increase; overpriced products get a decrease.
-- RETURNING reports the old and new prices, computed discount, and
-- related customer/order info.

WITH product_metrics AS (
  SELECT
    p.id AS product_id,
    p.price AS current_price,
    p.category_id,
    COALESCE(
      (SELECT avg(p2.price)
       FROM products p2
       WHERE p2.category_id = p.category_id
       AND p2.deleted_at IS NULL
       AND p2.id != p.id),
      p.price
    ) AS cat_avg_price,
    COALESCE(
      (SELECT avg(r.rating) FROM reviews r WHERE r.product_id = p.id),
      3
    ) AS avg_rating,
    COALESCE(
      (SELECT sum(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id),
      0
    ) AS total_sold,
    (
      SELECT count(*)
      FROM reviews r
      WHERE r.product_id = p.id
    ) AS review_count,
    (
      SELECT count(DISTINCT o.customer_id)
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id
    ) AS unique_buyers
  FROM products p
  WHERE p.deleted_at IS NULL
),

price_adjustments AS (
  SELECT
    pm.product_id,
    pm.current_price,
    pm.cat_avg_price,
    pm.avg_rating,
    pm.total_sold,
    pm.review_count,
    pm.unique_buyers,
    CASE
      WHEN pm.current_price < pm.cat_avg_price * 0.8
        AND pm.avg_rating >= 4
        AND pm.total_sold > 10
      THEN pm.current_price * 1.15
      WHEN pm.current_price > pm.cat_avg_price * 1.2
        AND pm.avg_rating < 3
      THEN pm.current_price * 0.85
      WHEN pm.total_sold = 0
        AND pm.review_count = 0
      THEN pm.current_price * 0.90
      ELSE pm.current_price
    END AS new_price,
    CASE
      WHEN pm.current_price < pm.cat_avg_price * 0.8
        AND pm.avg_rating >= 4
        AND pm.total_sold > 10
      THEN 'increase_underpriced'
      WHEN pm.current_price > pm.cat_avg_price * 1.2
        AND pm.avg_rating < 3
      THEN 'decrease_overpriced'
      WHEN pm.total_sold = 0
        AND pm.review_count = 0
      THEN 'clearance'
      ELSE 'no_change'
    END AS adjustment_reason
  FROM product_metrics pm
)

UPDATE products p
SET price = pa.new_price
FROM price_adjustments pa
WHERE p.id = pa.product_id
  AND pa.adjustment_reason != 'no_change'
  AND p.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = p.category_id
    AND c.deleted_at IS NULL
  )
  AND (
    SELECT count(*)
    FROM order_items oi
    WHERE oi.product_id = p.id
  ) >= 0
RETURNING
  p.id                                      AS product_id,       -- @notNull
  p.name                                    AS product_name,     -- @notNull
  p.sku                                     AS sku,              -- @notNull
  p.price                                   AS new_price,        -- @notNull
  pa.current_price                          AS old_price,        -- @notNull
  pa.new_price                              AS computed_new_price,  -- @notNull
  pa.cat_avg_price                          AS category_avg,     -- @notNull
  pa.avg_rating                             AS avg_rating,       -- @notNull
  pa.total_sold                             AS total_sold,       -- @notNull
  pa.review_count                           AS review_count,     -- @notNull
  pa.unique_buyers                          AS unique_buyers,    -- @notNull
  COALESCE(pa.current_price, p.price)       AS safe_old_price,   -- @notNull
  COALESCE(pa.avg_rating, 0)                AS safe_rating,     -- @notNull
  COALESCE(pa.total_sold, 0)                AS safe_sold,       -- @notNull
  COALESCE(pa.review_count, 0)              AS safe_review_count,  -- @notNull
  COALESCE(pa.unique_buyers, 0)             AS safe_buyers,     -- @notNull
  lower_strict(p.name)                      AS lower_name,      -- @notNull
  COALESCE(lower_strict(p.name), 'x')       AS safe_lower_name,  -- @notNull
  always_text(p.name)                       AS guaranteed_name,  -- @notNull
  always_positive(p.price)                  AS guaranteed_price, -- @notNull
  pa.adjustment_reason                      AS adjustment_reason,  -- @notNull
  CASE
    WHEN pa.new_price > pa.current_price THEN 'INCREASED'
    WHEN pa.new_price < pa.current_price THEN 'DECREASED'
    ELSE 'UNCHANGED'
  END                                       AS price_direction,  -- @notNull
  COALESCE(
    pa.new_price - pa.current_price,
    0
  )                                         AS price_delta,     -- @notNull
  CASE
    WHEN pa.current_price IS NOT NULL
     AND pa.current_price > 0
    THEN round(
      (pa.new_price - pa.current_price) / pa.current_price * 100,
      2
    )
    ELSE 0
  END                                       AS percent_change,   -- @notNull
  (
    SELECT c.name
    FROM categories c
    WHERE c.id = p.category_id
  )                                         AS category_name,   -- @nullable
  COALESCE(
    (SELECT c.name FROM categories c WHERE c.id = p.category_id),
    'Uncategorized'
  )                                         AS safe_category_name,  -- @notNull
  (
    SELECT COALESCE(sum(oi.quantity * oi.unit_price), 0)
    FROM order_items oi
    WHERE oi.product_id = p.id
  )                                         AS total_revenue,   -- @notNull
  (
    SELECT count(*)
    FROM order_items oi
    WHERE oi.product_id = p.id
  )                                         AS order_count,     -- @notNull
  EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.product_id = p.id
    AND r.rating = 5
  )                                         AS has_perfect_review,  -- @notNull
  NOT EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.product_id = p.id
    AND r.rating = 1
  )                                         AS no_worst_review, -- @notNull
  ROW(
    p.id,
    p.name,
    pa.current_price,
    p.price,
    pa.adjustment_reason
  )                                         AS update_record    -- @notNull
