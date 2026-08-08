-- The anchor hop alone, with only the OUTER relation renamed.
--
-- `fk-entail-subquery-alias-column-list.sql` renames all three relations at
-- once, which proves the composition works and hides which side of the
-- correlation was broken. This isolates the outer one: the subquery's
-- relations keep their catalog names and only `oi.k1` — the referencing
-- column the WHERE correlates on — is renamed.
--
-- `order_items.order_id` is a NOT NULL key onto `orders.id`, so the row the
-- subquery selects exists and `orders.status` is NOT NULL.
SELECT
  oi.k0  AS oiid,     -- @notNull
  (
    SELECT o.status
    FROM orders o
    WHERE o.id = oi.k1
  )      AS status    -- @notNull
FROM order_items oi(k0, k1)
