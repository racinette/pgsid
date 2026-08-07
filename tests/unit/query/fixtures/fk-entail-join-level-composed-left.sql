-- fk-entail-join-level-composed with the inner join's operands swapped, which
-- is a different reading and not a different query: a FULL JOIN is symmetric
-- in SQL and the walk keeps its two sides apart, so the side the composition
-- descends into has to be answered on both.
--
-- Here `orders` is the LEFT operand of the inner join. Every item matches an
-- order and nothing has filtered `orders`, so that join emits no item-only row
-- and every row it emits carries a stored order — the same conclusion the
-- other spelling reaches about its right operand. The outer join then reads
-- each of those rows' NOT NULL `customer_id` and cannot extend `customers`.
--
-- `o.id` and `oi.id` are NULL wherever the outer join extends its own left
-- side, which dense and uniform return.
SELECT
  c.id    AS cid,        -- @notNull
  o.id    AS oid,        -- @nullable
  oi.id   AS oiid        -- @nullable
FROM orders o
FULL JOIN order_items oi ON oi.order_id = o.id
FULL JOIN customers c ON o.customer_id = c.id
