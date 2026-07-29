-- When a GROUP BY guarantees a non-empty group, an aggregate over a non-null
-- expression is non-null: there is at least one row to aggregate and no NULL
-- among the values. The escape hatches below must each keep it nullable.
--
-- order_items.quantity and unit_price are NOT NULL and reached through inner
-- joins, so the aggregated expressions are non-null.
SELECT
  oi.order_id                          AS order_id,        -- @notNull
  count(*)                             AS item_count,      -- @notNull

  -- Non-empty group + non-null input.
  sum(oi.quantity)                     AS total_qty,       -- @notNull
  max(oi.unit_price)                   AS max_price,       -- @notNull
  min(oi.unit_price)                   AS min_price,       -- @notNull
  avg(oi.unit_price)                   AS avg_price,       -- @notNull
  array_agg(oi.quantity)               AS qty_list,        -- @notNull

  -- FILTER can exclude every row of the group.
  sum(oi.quantity) FILTER (WHERE false) AS filtered_qty,   -- @nullable

  -- Sample statistics are undefined (NULL) for a single-row group, so a
  -- non-empty group is not enough.
  stddev(oi.quantity)                  AS qty_stddev,      -- @nullable
  var_samp(oi.quantity)                AS qty_variance,    -- @nullable

  -- A nullable input means the aggregate may see only NULLs.
  max(p.deleted_at)                    AS last_deleted     -- @nullable
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY oi.order_id
