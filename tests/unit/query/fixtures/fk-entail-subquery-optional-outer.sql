-- Gate: the outer relation must be PRESENT.
--
-- A NULL-extended outer slice carries a NULL key, which matches nothing — so
-- the subquery is empty and the scalar is NULL however sound the key is. `t`
-- and `products` share no ids in any state, so the LEFT JOIN extends on every
-- row and both claims below are witnessed.
SELECT
  t.id                                                  AS tid,   -- @notNull
  p.name                                                AS pname, -- @nullable
  (SELECT p2.name FROM products p2 WHERE p2.id = p.id)  AS lookup -- @nullable
FROM t
LEFT JOIN products p ON p.id = t.id + 100000
