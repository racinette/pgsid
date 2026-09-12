-- The item predicate selects current catalog rows inside the CTE. The outer
-- aggregate keeps a warehouse with no matching lot while COUNT manufactures a
-- value and MAX remains nullable over that empty group.
-- @params none
-- @null-groups none
-- @param-rejections none
WITH current_stock AS (
  SELECT
    l.tenant_id,
    l.warehouse_id,
    l.on_hand,
    l.expires_at,
    i.current_label
  FROM stock_lots AS l
  JOIN inventory_items AS i
    ON i.tenant_id = l.tenant_id AND i.item_id = l.item_id
  WHERE i.retired_at IS NULL
)
SELECT
  w.warehouse_code,       -- @notNull
  count(s.current_label), -- @notNull
  max(s.on_hand),         -- @nullable
  max(s.expires_at)       -- @nullable
FROM warehouses AS w
LEFT JOIN current_stock AS s
  ON s.tenant_id = w.tenant_id AND s.warehouse_id = w.warehouse_id
GROUP BY w.tenant_id, w.warehouse_id, w.warehouse_code
