-- An outer join NULL-extends its optional side AS A UNIT: the inner join
-- (orders JOIN order_items) under the LEFT JOIN is one extension unit, so
-- columns from BOTH tables share a single presence group — proving o.id
-- non-null proves oi.id too, which is the walk's own null-group model
-- surfacing on the contract. dense: customer 3 has no orders (absent arm);
-- customer 1's order 1 has items (present arm). sparse: the customer's
-- order exists but order_items is empty, so the INNER join kills the pair
-- and the whole unit extends — the absent arm reached the other way.
-- @null-group 1*,2*
SELECT
  c.id  AS cid,   -- @notNull
  o.id  AS oid,   -- @nullable
  oi.id AS oiid   -- @nullable
FROM customers c
LEFT JOIN (orders o JOIN order_items oi ON oi.order_id = o.id)
  ON o.customer_id = c.id
