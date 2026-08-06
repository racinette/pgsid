-- Multiple join types in a single FROM: INNER + LEFT + RIGHT + FULL.
-- The outer FULL JOIN makes everything optional. ON clauses reference
-- columns from earlier joins. WHERE promotes two aliases (o and c) but
-- leaves two optional (oi/p, s). The per-alias promotion means
-- c.id is notNull (promoted via c.email IS NOT NULL), not just c.email.
SELECT
  o.id           AS order_id,       -- @notNull
  oi.id          AS item_id,        -- @notNull
  c.id           AS customer_id,    -- @notNull
  c.name         AS customer_name,  -- @nullable
  -- order_items.product_id is a NOT NULL FOREIGN KEY onto products, so this
  -- LEFT JOIN always matches — but only for rows carrying a real order_items
  -- slice, which is why the entailment waits on the WHERE proving `o` present
  -- and the INNER join carrying that to `oi`. The RIGHT/FULL extensions that
  -- could null p are refiltered by `o.id IS NOT NULL`.
  p.name         AS product_name,   -- @notNull
  s.carrier      AS carrier,        -- @nullable
  COALESCE(s.tracking_no, 'N/A') AS tracking  -- @notNull
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
RIGHT JOIN customers c ON c.id = o.customer_id
FULL JOIN shipments s ON s.order_id = o.id
WHERE o.id IS NOT NULL AND c.email IS NOT NULL
