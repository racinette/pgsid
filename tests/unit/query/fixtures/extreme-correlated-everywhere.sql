-- Extreme fixture: deeply nested correlated subqueries in every clause
-- position — SELECT, WHERE, HAVING, ORDER BY, CASE condition, function
-- argument, aggregate argument, and JOIN ON.
--
-- Tests: 4-level correlated subquery nesting, scalar subqueries with
-- aggregates, EXISTS/NOT EXISTS, IN subqueries, correlated references
-- resolving through multiple scope levels, and strict functions wrapping
-- correlated subquery results.
--
-- The query finds products that are "anomalies": their price is far from
-- the category average, they have few reviews relative to similar products,
-- or their order patterns differ from the category norm.

SELECT
  p.id                                      AS product_id,       -- @notNull
  p.name                                    AS product_name,     -- @notNull
  p.sku                                     AS sku,              -- @notNull
  p.price                                   AS price,            -- @notNull
  p.category_id                             AS category_id,      -- @nullable
  p.deleted_at                              AS deleted_at,       -- @nullable
  COALESCE(p.category_id, 0)                AS safe_category,   -- @notNull

  -- Category average price (correlated to product's category)
  (
    SELECT COALESCE(avg(p2.price), 0)
    FROM products p2
    WHERE p2.category_id = p.category_id
    AND p2.deleted_at IS NULL
    AND p2.id != p.id
  )                                         AS cat_avg_price,   -- @notNull

  -- Price deviation from category average
  p.price - (
    SELECT COALESCE(avg(p2.price), 0)
    FROM products p2
    WHERE p2.category_id = p.category_id
    AND p2.deleted_at IS NULL
  )                                         AS price_deviation, -- @nullable

  -- Review count (correlated scalar subquery with count)
  (
    SELECT count(*)
    FROM reviews r
    WHERE r.product_id = p.id
  )                                         AS review_count,    -- @notNull

  -- Average rating (correlated, can be NULL if no reviews)
  (
    SELECT avg(r.rating)
    FROM reviews r
    WHERE r.product_id = p.id
  )                                         AS avg_rating,      -- @nullable

  -- Category's average review count (double nesting: product → category → products → reviews)
  (
    SELECT COALESCE(avg(sub.review_cnt), 0)
    FROM (
      SELECT count(*) AS review_cnt
      FROM reviews r2
      JOIN products p3 ON p3.id = r2.product_id
      WHERE p3.category_id = p.category_id
      AND p3.deleted_at IS NULL
      GROUP BY p3.id
    ) sub
  )                                         AS cat_avg_reviews, -- @notNull

  -- Category's max price (correlated)
  (
    SELECT COALESCE(max(p2.price), 0)
    FROM products p2
    WHERE p2.category_id = p.category_id
    AND p2.deleted_at IS NULL
  )                                         AS cat_max_price,   -- @notNull

  -- Total units sold (correlated through order_items)
  (
    SELECT COALESCE(sum(oi.quantity), 0)
    FROM order_items oi
    WHERE oi.product_id = p.id
  )                                         AS total_sold,      -- @notNull

  -- Category's average units sold (triple nesting)
  (
    SELECT COALESCE(avg(sub.units), 0)
    FROM (
      SELECT COALESCE(sum(oi2.quantity), 0) AS units
      FROM order_items oi2
      JOIN products p3 ON p3.id = oi2.product_id
      WHERE p3.category_id = p.category_id
      AND p3.deleted_at IS NULL
      GROUP BY p3.id
    ) sub
  )                                         AS cat_avg_sold,    -- @notNull

  -- Is this product's price an outlier? (CASE with correlated subquery)
  CASE
    WHEN p.price > (
      SELECT COALESCE(avg(p2.price), 0) * 2
      FROM products p2
      WHERE p2.category_id = p.category_id
      AND p2.deleted_at IS NULL
    ) THEN 'expensive_outlier'
    WHEN p.price < (
      SELECT COALESCE(avg(p2.price), 0) / 2
      FROM products p2
      WHERE p2.category_id = p.category_id
      AND p2.deleted_at IS NULL
    ) THEN 'cheap_outlier'
    ELSE 'normal'
  END                                       AS price_status,    -- @nullable

  -- Does this product have fewer reviews than the category average?
  CASE
    WHEN (
      SELECT count(*)
      FROM reviews r
      WHERE r.product_id = p.id
    ) < (
      SELECT COALESCE(avg(sub.cnt), 0)
      FROM (
        SELECT count(*) AS cnt
        FROM reviews r2
        JOIN products p3 ON p3.id = r2.product_id
        WHERE p3.category_id = p.category_id
        GROUP BY p3.id
      ) sub
    ) THEN 'underreviewed'
    ELSE 'adequately_reviewed'
  END                                       AS review_status,   -- @nullable

  -- Strict function wrapping a correlated subquery
  lower_strict(
    (SELECT p2.name FROM products p2 WHERE p2.id = p.id)
  )                                         AS lower_name_subq, -- @nullable

  -- COALESCE with strict function wrapping correlated subquery
  COALESCE(
    lower_strict(
      (SELECT p2.name FROM products p2 WHERE p2.id = p.id)
    ),
    'unknown'
  )                                         AS safe_lower_name, -- @notNull

  -- Domain NOT NULL function wrapping correlated subquery result
  always_text(
    (SELECT p2.name FROM products p2 WHERE p2.id = p.id)
  )                                         AS guaranteed_name, -- @notNull

  -- EXISTS checks
  EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.id
    AND oi.quantity > 50
  )                                         AS has_bulk_order,  -- @notNull

  NOT EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.product_id = p.id
    AND r.rating < 3
  )                                         AS no_bad_reviews,  -- @notNull

  -- Window functions
  rank() OVER (
    PARTITION BY p.category_id
    ORDER BY p.price DESC
  )                                         AS price_rank,      -- @nullable

  count(*) OVER (
    PARTITION BY p.category_id
  )                                         AS cat_product_count,  -- @notNull

  -- Total products across all categories
  count(*) OVER ()                          AS total_products   -- @notNull

FROM products p
WHERE p.deleted_at IS NULL
  -- Products in categories with more than 2 products
  AND (
    SELECT count(*)
    FROM products p2
    WHERE p2.category_id = p.category_id
    AND p2.deleted_at IS NULL
  ) > 2
  -- Products that have at least one order OR one review
  AND (
    EXISTS (
      SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
    )
    OR EXISTS (
      SELECT 1 FROM reviews r WHERE r.product_id = p.id
    )
  )
  -- Products whose price deviates from category average
  AND p.price != (
    SELECT COALESCE(avg(p2.price), 0)
    FROM products p2
    WHERE p2.category_id = p.category_id
    AND p2.deleted_at IS NULL
  )
ORDER BY
  -- ORDER BY with correlated subquery
  (
    SELECT COALESCE(sum(oi.quantity), 0)
    FROM order_items oi
    WHERE oi.product_id = p.id
  ) DESC,
  p.price ASC
