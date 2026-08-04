-- The unit is a computed subquery: extension nulls its whole output row,
-- computed columns included, so membership needs no base-table origin —
-- and given presence, the inner analysis speaks: count(*) over a real
-- group is non-null, making item_count a discriminant alongside the
-- grouping key. dense: order 4 has no items (absent arm); orders 1-3
-- have items (present arm).
-- @null-group 1*,2*
SELECT
  o.id           AS oid,   -- @notNull
  agg.order_id   AS aid,   -- @nullable
  agg.item_count AS cnt    -- @nullable
FROM orders o
LEFT JOIN (
  SELECT order_id, count(*) AS item_count
  FROM order_items
  GROUP BY order_id
) agg ON agg.order_id = o.id
