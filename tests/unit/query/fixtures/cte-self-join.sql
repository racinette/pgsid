-- CTE referenced multiple times: the same CTE joined to itself.
-- The CTE is analyzed once (memoized); both references read the cached
-- per-column results. sum is nullable, so the total columns are nullable.
WITH order_totals AS (
  SELECT
    oi.order_id                       AS order_id,
    sum(oi.unit_price * oi.quantity)  AS total
  FROM order_items oi
  GROUP BY oi.order_id
)
SELECT
  a.order_id          AS order_id,   -- @notNull
  a.total             AS total_a,    -- @nullable
  b.total             AS total_b,    -- @nullable
  a.total + b.total   AS combined    -- @nullable
FROM order_totals a
JOIN order_totals b ON a.order_id < b.order_id
