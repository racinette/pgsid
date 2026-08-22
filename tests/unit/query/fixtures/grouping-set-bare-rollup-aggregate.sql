-- The control for the non-empty-group gate under GROUPING SETS: a ROLLUP with
-- NO plain term beside it.
--
-- `ROLLUP(p.category_id)` expands to `(category_id)` and `()`, and the EMPTY
-- generated set emits its row whether or not any input row exists — measured,
-- an empty table gives one row with both columns NULL. So the group behind
-- that row is empty and `sum` is NULL on it, even though `products.price` is
-- NOT NULL.
--
-- That is the whole distinction the gate turns on as of 2026-08-22. It used to
-- refuse any GroupingSet term at all, which cost grouping-sets-columns.sql its
-- claim: there a plain `p.sku` sits beside the ROLLUP and appears in every
-- generated set, so no generated set is empty. Here nothing does.
--
-- Witnessed rather than argued — the `empty` data state produces exactly the
-- grand-total row above, so the nullable claim has a NULL behind it.
SELECT
  p.category_id,   -- @nullable  (blanked on the grand-total row)
  sum(p.price)     -- @nullable  (the grand-total row's group is empty)
FROM products p
GROUP BY ROLLUP(p.category_id)
