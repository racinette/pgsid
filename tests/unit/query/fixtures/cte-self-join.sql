-- CTE referenced multiple times: the same CTE joined to itself.
-- The CTE is analyzed once (memoized); both references read the cached
-- per-column results. sum over a non-empty group of NOT NULL values is
-- non-null, so the total columns — and their sum — are non-null.
WITH order_totals AS (
  SELECT
    oi.order_id                       AS order_id,
    sum(oi.unit_price * oi.quantity)  AS total
  FROM order_items oi
  GROUP BY oi.order_id
)
SELECT
  a.order_id          AS order_id,   -- @notNull
  a.total             AS total_a,    -- @notNull
  b.total             AS total_b,    -- @notNull
  a.total + b.total   AS combined    -- @notNull
FROM order_totals a
JOIN order_totals b ON a.order_id < b.order_id
