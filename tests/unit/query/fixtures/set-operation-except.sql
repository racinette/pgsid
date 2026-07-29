-- EXCEPT draws every result row from the LEFT branch, so the left branch alone
-- decides nullability — whatever the right branch contains is only used to
-- remove rows, never to supply values.
--
-- products.sku is NOT NULL; customers.name is nullable.
SELECT
  p.sku    AS from_left   -- @notNull
FROM products p
EXCEPT
SELECT c.name FROM customers c
