-- The control for `merge-arm-condition-disjunction.sql`, ONE CLAUSE APART.
--
-- The NOT MATCHED arm here has no `AND`, so it fires on its match kind alone:
-- every source row without a target match is inserted, whatever
-- `s.category_id` holds. The disjunction of the arms' conditions therefore
-- contains TRUE and constrains nothing, and the column goes back to what the
-- catalog says about it.
--
-- This is the guard that keeps the disjunction honest. A producer that
-- collected only the conditions it FOUND — skipping the arm that has none —
-- would read the same fact here as in the sibling and claim a column the
-- statement genuinely returns empty. The refusal has to be triggered by the
-- ABSENCE, which is the one thing a list of found conditions cannot see.
--
-- @planner-keeps 1: EXPLAIN plans MERGE's matching as an outer join, and it
--   is no JoinExpr, so the join audit has no record of it — the arm-condition
--   reading lives on the scope, not on a join.
MERGE INTO tags t
USING products s
ON t.id = s.id
WHEN MATCHED AND s.category_id > 0 THEN
  UPDATE SET name = s.sku
WHEN NOT MATCHED THEN
  INSERT (id, name) VALUES (s.id, s.sku)
RETURNING
  t.id           AS tag_id,      -- @notNull
  s.sku          AS source_sku,  -- @notNull
  s.category_id  AS source_cat   -- @nullable
