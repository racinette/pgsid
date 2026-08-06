-- Gate: the REFERENCED side must be extended by THIS join, not a deeper one.
--
-- The mirror of fk-entail-optional-referencer.sql, and the near miss its
-- comment names. There the referencing side arrives already extended; here the
-- REFERENCED side does. `orders` is made optional by the first FULL JOIN — a
-- customer with no orders — and the second FULL JOIN then carries a key whose
-- referenced side is that same `orders`. The key says every stored
-- `order_items` row has a matching order, which is true and says nothing about
-- a row that has NO order_items at all: a customer with neither survives the
-- second join with `orders` and `order_items` both extended.
--
-- The engine promoted `orders` there and claimed notNull for `o.id`, which
-- `dense` returns NULL in. `incomingRequired` is a property of the incoming
-- SLICE, and the slice really is required — it is `orders` INSIDE it that was
-- already optional, which is the distinction the gate now makes.
--
-- Found by the schema axis (docs/generated-surface.md item 4) on its first
-- run, under the `fk-chain` variant, in a UNION whose second branch is the
-- all-FULL variant of a t—u—v join. It needed a foreign key on the generator's
-- own three relations, which is exactly the coverage the register measured as
-- ZERO: `t`, `u` and `v` declare no keys, and their seed data deliberately
-- dangles a quarter of its rows so outer joins have something to extend.
-- What the fix costs, recorded rather than discovered later: `cid` really is
-- never NULL, and the engine no longer says so. Every `order_items` row has a
-- matching order and the left slice keeps every order, so the second FULL JOIN
-- produces no order_items-only row and never extends its left side at all —
-- which makes `customers` present throughout. The engine reached that answer
-- before the fix, but by the wrong route: `o` was promoted unsoundly and `c`
-- rode along on null-group co-membership. Recovering it soundly needs a
-- distinction the walk does not draw — "this join never extends its left side"
-- is not "every member of that side is present", and `o` genuinely can be
-- absent from the FIRST join's extension.
-- @unwitnessable 0: every order has a customer and every order item has an
--   order, so no state can produce a customer-less row here; the claim is
--   conservative, not falsifiable
SELECT
  c.id    AS cid,        -- @nullable
  o.id    AS oid,        -- @nullable
  oi.id   AS oiid        -- @nullable
FROM customers c
FULL JOIN orders o ON o.customer_id = c.id
FULL JOIN order_items oi ON oi.order_id = o.id
