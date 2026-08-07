-- Gate: the JOIN's ON must be exactly the key equality, for the same reason
-- the WHERE must be (fk-entail-subquery-extra-conjunct.sql).
--
-- The key still guarantees the customer row; the status test then throws it
-- away again. Any further conjunct can only remove matches, and removing the
-- match is precisely the emptiness the claim would deny — dense returns items
-- on orders in other statuses, and the subquery is NULL for them.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT c.email
    FROM orders o
    JOIN customers c ON c.id = o.customer_id AND o.status = 'fulfilled'
    WHERE o.id = oi.order_id
  )      AS email   -- @nullable
FROM order_items oi
