-- DELETE ... USING ... RETURNING with WHERE promotion.
-- The USING clause adds a relation (customers) with inner-join semantics:
-- an orders row with no matching customer is not deleted, so USING columns
-- are never NULL-extended in RETURNING.
-- The RETURNING list has COALESCE and a column reference.
DELETE FROM orders
USING customers c
WHERE orders.customer_id = c.id
  AND c.email IS NOT NULL
RETURNING
  orders.id        AS id,          -- @notNull
  orders.customer_id AS customer_id, -- @notNull
  orders.status    AS status,     -- @notNull
  COALESCE(orders.deleted_at, now()) AS deleted  -- @notNull
