-- INTERSECT returns values present in BOTH branches, so either side can prove
-- a column non-null: a value that appears in a NOT NULL column cannot be NULL,
-- regardless of what the other side's column allows.
--
-- Here the left column is nullable and the right is NOT NULL, so the result is
-- still non-null — the case a plain AND of the two sides would get wrong.
SELECT
  c.name   AS narrowed   -- @notNull
FROM customers c
INTERSECT
SELECT p.sku FROM products p
