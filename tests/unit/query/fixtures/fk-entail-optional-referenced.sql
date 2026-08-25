-- Gate: the REFERENCED side must be extended by THIS join, not a deeper one —
-- and the JOIN-LEVEL fact that recovers the leftmost column anyway.
--
-- The mirror of fk-entail-optional-referencer.sql, and the near miss its
-- comment names. There the referencing side arrives already extended; here the
-- REFERENCED side does. `orders` is made optional by the first FULL JOIN — a
-- customer with no orders — and the second FULL JOIN then carries a key whose
-- referenced side is that same `orders`. The key says every stored
-- `order_items` row has a matching order, which is true and says nothing about
-- a row that has NO order_items at all: a customer with neither survives the
-- second join with `orders` and `order_items` both extended. So `o.id` is
-- nullable, and `dense` returns NULL in it.
--
-- `c.id` is a different question, and it is the JOIN that answers it. Every
-- item has an order and the left slice keeps every order — a FULL JOIN drops
-- nothing — so the second join finds a match for every item and never extends
-- its left side at all. That fact belongs to the join, not to any alias:
-- `orders` inside that side can still be absent, from the FIRST join's
-- extension. What it licenses is that the first join is not extended from
-- above, and the key on THAT join — every order has a customer — then makes
-- `customers` present throughout.
--
-- Found by the schema axis on its first
-- run, under the `fk-chain` variant, in a UNION whose second branch is the
-- all-FULL variant of a t—u—v join. It needed a foreign key on the generator's
-- own three relations, which is exactly the coverage the register measured as
-- ZERO: `t`, `u` and `v` declare no keys, and their seed data deliberately
-- dangles a quarter of its rows so outer joins have something to extend.
SELECT
  c.id    AS cid,        -- @notNull
  o.id    AS oid,        -- @nullable
  oi.id   AS oiid        -- @nullable
FROM customers c
FULL JOIN orders o ON o.customer_id = c.id
FULL JOIN order_items oi ON oi.order_id = o.id
