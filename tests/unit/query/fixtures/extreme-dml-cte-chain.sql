-- DML: INSERT...SELECT from CTE chain, with RETURNING expressions.
-- CTE 'source_products' filters products, CTE 'priced' joins with
-- order_items. RETURNING references the target table (shipments) and
-- includes both NOT NULL and nullable columns.
WITH source_products AS (
  SELECT id, name, price FROM products WHERE deleted_at IS NULL
),
priced AS (
  SELECT sp.id, sp.name, sp.price, oi.order_id
  FROM source_products sp
  JOIN order_items oi ON oi.product_id = sp.id
)
INSERT INTO shipments (order_id, carrier, tracking_no)
SELECT p.order_id, 'UPS', NULL::text FROM priced p
RETURNING
  id                            AS id,             -- @notNull
  order_id                      AS order_id,       -- @notNull
  carrier                       AS carrier,        -- @notNull
  tracking_no                   AS tracking_no,    -- @nullable
  COALESCE(tracking_no, 'N/A')  AS safe_tracking,  -- @notNull
  shipped_at                    AS shipped_at      -- @nullable
