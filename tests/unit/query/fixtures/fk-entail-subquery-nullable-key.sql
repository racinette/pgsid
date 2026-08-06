-- Gate: the key column must be NOT NULL.
--
-- `p2.category_id = p.category_id` cannot match when the outer value is NULL —
-- NULL is not equal to itself — so the subquery is empty and the scalar NULL.
-- dense's product 3 carries no category and witnesses it. This is also what
-- closes MATCH SIMPLE's partial-NULL hole for composite keys, one shape over.
SELECT
  p.id                                                             AS id,  -- @notNull
  (SELECT c2.name FROM categories c2 WHERE c2.id = p.category_id)  AS cat  -- @nullable
FROM products p
