-- CTE chain: three CTEs, each referencing the previous.
-- Tests cross-scope propagation through a chain of scopes:
--   base → (LEFT JOIN, nullable val) → (INNER JOIN, non-null carry-through)
--   → outer SELECT
-- Each CTE is analyzed once (memoized); results thread through the chain.
WITH base AS (
  SELECT id, name, deleted_at FROM products
),
joined AS (
  SELECT b.id, b.name, b.deleted_at, r.rating
  FROM base b
  LEFT JOIN reviews r ON r.product_id = b.id
),
aggregated AS (
  SELECT j.id, j.name, j.deleted_at, count(r.rating) AS review_count
  FROM joined j
  JOIN reviews r ON r.product_id = j.id
  GROUP BY j.id, j.name, j.deleted_at
)
SELECT
  a.id           AS id,            -- @notNull
  a.name         AS name,          -- @notNull
  a.deleted_at   AS deleted_at,    -- @nullable
  a.review_count AS review_count   -- @notNull
FROM aggregated a
