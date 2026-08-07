-- The chain is iterative, not one hop with a special case: three relations,
-- two joins, and every relation reached from the one before it.
--
-- The anchor is a SELF-LOOKUP — the subquery scans the relation the outer
-- query scans and keys on the same NOT NULL column, so the outer row is in the
-- scanned set. From there `oi2.order_id` settles `orders` and that order's
-- `customer_id` settles `customers`, each key NOT NULL and each target a whole
-- unfiltered relation.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT c.email
    FROM order_items oi2
    JOIN orders o    ON o.id = oi2.order_id
    JOIN customers c ON c.id = o.customer_id
    WHERE oi2.id = oi.id
  )      AS email    -- @notNull
FROM order_items oi
