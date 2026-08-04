-- DELETE ... USING with an outer join inside the USING list: the target
-- joins its USING relations with inner semantics, but an outer join
-- WRITTEN there is honoured, so the shipments unit groups in RETURNING
-- exactly as it would in a SELECT. Each product_tags row pairs with
-- exactly one order (tag_id + 1 = o.id — deterministic RETURNING even
-- with USING): dense tag 1 → order 2, unshipped (absent arm); tag 2 →
-- order 3, shipped (present arm).
-- @null-group 1*,2*
DELETE FROM product_tags
USING orders o
LEFT JOIN shipments s ON s.order_id = o.id
WHERE product_tags.tag_id + 1 = o.id
RETURNING
  product_tags.tag_id,   -- @notNull
  s.id AS sid,           -- @nullable
  s.carrier              -- @nullable
