-- Extreme fixture: product catalog with review aggregation, tag lookup,
-- coupon discounts, and cross-referencing scalar subqueries.
--
-- Tests: multiple CTEs with different aggregation levels, LATERAL join
-- with a correlated subquery, EXISTS subquery, scalar subquery with
-- aggregate, COALESCE with domain NOT NULL function, strict function
-- chains, ARRAY sublink, RowExpr, CollateClause, NamedArgExpr with
-- reordered args, and FILTER clauses on aggregates.
--
-- For each product, the query computes: review statistics (avg, count,
-- distribution), top tags, applicable coupon discount, category path,
-- and a computed status. The result combines window functions, CTEs,
-- and deeply nested expressions.
--
-- pr (product_reviews) is the one presence group: the FILTER counts
-- discriminate (count is non-null over any present group row), while
-- top_reviewers stays nullable even when present (its string_agg subquery
-- can find no 4+ reviews). pt/pos/cp contribute only ONE bare column each
-- — below the two-member floor, no group.
-- @null-group 11*,12*,14
WITH product_reviews AS (
  SELECT
    r.product_id,
    count(*) AS review_count,
    COALESCE(avg(r.rating), 0) AS avg_rating,
    COALESCE(max(r.rating), 0) AS max_rating,
    COALESCE(min(r.rating), 0) AS min_rating,
    count(*) FILTER (WHERE r.rating >= 4) AS high_ratings,
    count(*) FILTER (WHERE r.rating <= 2) AS low_ratings,
    count(r.comment) AS commented_count,
    (
      SELECT string_agg(DISTINCT c2.name, ', ')
      FROM reviews r2
      JOIN customers c2 ON c2.id = r2.customer_id
      WHERE r2.product_id = r.product_id
      AND r2.rating >= 4
    ) AS top_reviewers
  FROM reviews r
  GROUP BY r.product_id
),

product_tags_cte AS (
  SELECT
    pt.product_id,
    array_agg(t.name ORDER BY t.name) AS tag_names,
    count(*) AS tag_count
  FROM product_tags pt
  JOIN tags t ON t.id = pt.tag_id
  GROUP BY pt.product_id
),

category_path AS (
  WITH RECURSIVE cat_chain AS (
    SELECT id, parent_id, name, 0 AS depth
    FROM categories
    WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, c.name, cc.depth + 1
    FROM categories c
    JOIN cat_chain cc ON c.parent_id = cc.id
  )
  SELECT
    c.id AS category_id,
    string_agg(c.name, ' > ' ORDER BY c.depth) AS path
  FROM cat_chain c
  GROUP BY c.id
),

product_order_stats AS (
  SELECT
    oi.product_id,
    count(DISTINCT oi.order_id) AS order_count,
    COALESCE(sum(oi.quantity), 0) AS total_quantity,
    COALESCE(sum(oi.unit_price * oi.quantity), 0) AS total_revenue,
    max(oi.unit_price) AS max_unit_price
  FROM order_items oi
  GROUP BY oi.product_id
)

SELECT
  p.id                                     AS product_id,       -- @notNull
  p.sku                                    AS sku,              -- @notNull
  p.name                                   AS product_name,     -- @notNull
  p.name COLLATE "C"                       AS collated_name,    -- @notNull
  p.price                                  AS price,            -- @notNull
  p.deleted_at                             AS deleted_at,       -- @alwaysNull  soft-delete filter
  p.category_id                            AS category_id,      -- @nullable
  COALESCE(pr.review_count, 0)             AS review_count,     -- @notNull
  COALESCE(pr.avg_rating, 0)               AS avg_rating,       -- @notNull
  COALESCE(pr.max_rating, 0)               AS max_rating,       -- @notNull
  COALESCE(pr.min_rating, 0)               AS min_rating,       -- @notNull
  pr.high_ratings                          AS high_ratings,     -- @nullable
  pr.low_ratings                           AS low_ratings,      -- @nullable
  COALESCE(pr.commented_count, 0)          AS commented_count,  -- @notNull
  pr.top_reviewers                         AS top_reviewers,    -- @nullable
  pt.tag_names                             AS tag_names,        -- @nullable
  COALESCE(pt.tag_count, 0)                AS tag_count,        -- @notNull
  COALESCE(pos.order_count, 0)             AS order_count,      -- @notNull
  COALESCE(pos.total_quantity, 0)          AS total_quantity,   -- @notNull
  COALESCE(pos.total_revenue, 0)           AS total_revenue,    -- @notNull
  pos.max_unit_price                       AS max_unit_price,   -- @nullable
  cp.path                                  AS category_path,    -- @nullable
  lower_strict(p.name)                     AS lower_name,       -- @notNull
  COALESCE(lower_strict(p.name), 'x')      AS safe_lower_name,  -- @notNull
  always_text(p.name)                      AS guaranteed_name,  -- @notNull
  concat_val(b => p.sku, a => p.name)      AS reordered_concat, -- @notNull
  ARRAY(SELECT t2.name FROM tags t2
        JOIN product_tags pt2 ON pt2.tag_id = t2.id
        WHERE pt2.product_id = p.id)       AS tags_array,      -- @notNull
  ROW(p.id, p.name, p.price)               AS product_row,     -- @notNull
  COALESCE(
    (SELECT cp2.path FROM category_path cp2 WHERE cp2.category_id = p.category_id),
    'Uncategorized'
  )                                        AS safe_category_path,  -- @notNull
  CASE
    WHEN p.deleted_at IS NOT NULL THEN 'archived'
    WHEN COALESCE(pr.review_count, 0) = 0 THEN 'noreviews'
    WHEN pr.avg_rating >= 4 THEN 'toprated'
    WHEN pr.avg_rating >= 3 THEN 'average'
    ELSE 'poor'
  END                                      AS status,          -- @notNull
  CASE
    WHEN EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.product_id = p.id
      AND oi.quantity > 10
    ) THEN 'bulk'
    ELSE 'standard'
  END                                      AS order_type,      -- @notNull
  rank() OVER (ORDER BY COALESCE(pos.total_revenue, 0) DESC) AS revenue_rank,  -- @notNull
  count(*) OVER ()                         AS total_products,  -- @notNull
  COALESCE(
    (SELECT max(c.discount_percent)
     FROM coupons c
     WHERE c.expires_at IS NULL OR c.expires_at > now()),
    0
  )                                        AS max_discount     -- @notNull
FROM products p
LEFT JOIN product_reviews pr ON pr.product_id = p.id
LEFT JOIN product_tags_cte pt ON pt.product_id = p.id
LEFT JOIN product_order_stats pos ON pos.product_id = p.id
LEFT JOIN category_path cp ON cp.category_id = p.category_id
WHERE p.deleted_at IS NULL
ORDER BY COALESCE(pos.total_revenue, 0) DESC
