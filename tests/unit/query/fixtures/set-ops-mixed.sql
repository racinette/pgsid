-- Set operations combining nullable and non-null columns.
-- UNION and EXCEPT are left-associative; each output column is the AND of
-- the corresponding columns across all operands.
SELECT
  id    AS id,      -- 
  name  AS name     -- 
FROM customers
UNION
SELECT id, name FROM categories
EXCEPT
SELECT id, name FROM products
