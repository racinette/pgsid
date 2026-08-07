-- The control for fk-entail-join-level-composed: the same three-relation
-- FULL-FULL shape with a NULLABLE key at the inner join.
--
-- `products.category_id` may be NULL, and a NULL key matches nothing, so the
-- first join extends its right side for an uncatalogued product — sparse seeds
-- exactly that. The composition therefore stops at the first step: rows of the
-- left slice do not all carry a stored category, and nothing downstream may
-- read the second join as always matching either.
--
-- Every column here is nullable and every one is witnessed, which is what
-- keeps the mechanism from quietly widening: the inner key's NOT NULL is
-- load-bearing, not decorative.
SELECT
  cat.id  AS catid,      -- @nullable
  p.id    AS pid,        -- @nullable
  oi.id   AS oiid        -- @nullable
FROM products p
FULL JOIN categories cat ON p.category_id = cat.id
FULL JOIN order_items oi ON oi.product_id = p.id
