-- @unwitnessable 2: the LEFT JOIN's ON is an equality on orders.customer_id,
--   a NOT NULL FOREIGN KEY onto customers.id, so it matches in every state
--   and the optional side never null-extends. The claim is correct and the
--   imprecision is the engine's: it does not read foreign keys. (The reason
--   recorded here before named the CROSS JOIN, which has nothing to do with
--   it — the LEFT JOIN is what makes the column nullable.)
-- CROSS JOIN: parses as JOIN_INNER with no quals. Both sides are REQUIRED.
-- CROSS JOIN of two NOT NULL tables — all columns non-null.
-- Combined with a LEFT JOIN to show mixed join types in one FROM.
SELECT
  o.id    AS order_id,    -- @notNull
  oi.id   AS item_id,     -- @notNull
  c.email AS customer_email,  -- @nullable
  oi.quantity AS quantity  -- @notNull
FROM orders o
CROSS JOIN order_items oi
LEFT JOIN customers c ON c.id = o.customer_id
