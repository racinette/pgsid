-- The same gate on the other arm: a PROVEN-PRESENT referencing side does not
-- make the referenced side's rows survive.
--
-- `orders` is required and its `customer_id` is a NOT NULL key, so every row
-- carries a stored customer — and the LEFT JOIN still extends, because the
-- customer it points at may not be in the right slice at all. The INNER join
-- inside that slice keeps only customers with an address, and an order placed
-- by a customer without one finds nothing: sparse, dense and uniform all
-- return that row, with `c.id` and `a.id` NULL.
--
-- The reading it refutes is the tempting one — "every emitted row carries a
-- stored referencing row, so it carries the match too". It carries the match
-- in the TABLE. The slice is where the join looks.
--
-- `c` and `a` are one NULL-extension unit — the LEFT JOIN extends the whole
-- inner slice at once, and each is non-null when present.
-- @null-group 1*,2*
SELECT
  o.id    AS oid,        -- @notNull
  c.id    AS cid,        -- @nullable
  a.id    AS aid         -- @nullable
FROM orders o
LEFT JOIN (customers c INNER JOIN addresses a ON a.customer_id = c.id)
  ON c.id = o.customer_id
