-- Gate: the key says the match exists in the TABLE; the join finds it only if
-- it is still in the SLICE.
--
-- Every `order_items` row has a matching order, so the FULL JOIN looks unable
-- to produce an item-only row — and it produces one anyway, because the INNER
-- join above it already threw the match away. Only FULFILLED orders reach the
-- second join, and an item on an order with any other status has nothing left
-- to match: `dense` returns that row, with `o.id` AND `c.id` NULL.
--
-- The filter is an ordinary status predicate rather than anything contrived,
-- which is the point: reading a key as "this join always matches" is only ever
-- true of a side nothing has filtered.
--
-- `c` and `o` are one NULL-extension unit — the INNER join binds them, so a
-- promotion of either would carry the other, and the rows this fixture is
-- about are the ones where the unit is extended as a whole.
-- @null-group 0*,1*
SELECT
  c.id    AS cid,        -- @nullable
  o.id    AS oid,        -- @nullable
  oi.id   AS oiid        -- @nullable
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id AND o.status = 'fulfilled'
FULL JOIN order_items oi ON oi.order_id = o.id
