-- Set operations combine per-column nullability differently by operator.
--
-- UNION emits rows from both branches, so a column is non-null only if both
-- sides say so. EXCEPT and INTERSECT draw every result row from the LEFT
-- branch — INTERSECT merely requires a matching row on the right — so the
-- left branch alone settles it. INTERSECT can additionally rule NULLs out
-- from the right, since a value present in both sides cannot be NULL if
-- either side says it isn't.
--
-- products.sku is NOT NULL; customers.name is nullable.
SELECT
  p.sku       AS a,   -- @notNull
  c.name      AS b,   -- @nullable
  p.name      AS d    -- @nullable
FROM products p
CROSS JOIN customers c

UNION

-- UNION: column a stays non-null (both sides non-null); b is nullable on the
-- left already; d becomes nullable because THIS branch supplies a NULL.
SELECT
  p2.name,
  p2.sku,
  NULL::text
FROM products p2
