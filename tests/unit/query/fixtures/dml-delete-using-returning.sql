-- DELETE ... USING ... RETURNING with WHERE promotion.
-- The USING clause adds a relation (customers) as optional (LEFT JOIN
-- semantics in DELETE...USING). WHERE c.email IS NOT NULL promotes it.
-- The RETURNING list has COALESCE and a column reference.
DELETE FROM orders
USING customers c
WHERE orders.customer_id = c.id
  AND c.email IS NOT NULL
RETURNING
  id               AS id,          -- @notNull
  customer_id      AS customer_id, -- @notNull
  status            AS status,     -- @notNull
  COALESCE(deleted_at, now()) AS deleted  -- @nullable
