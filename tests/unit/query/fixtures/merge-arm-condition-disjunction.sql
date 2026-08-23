-- A MERGE arm's OWN condition, as row-implied evidence.
--
-- A returned row came from exactly one row-producing arm, and an arm fires
-- only when its match kind holds AND its condition is TRUE. So every returned
-- row satisfies the DISJUNCTION of the producing arms' conditions. Both arms
-- here compare `s.category_id`, and a comparison is NULL rather than TRUE when
-- its operand is, so whichever arm fired, that column had a value.
--
-- The register carried this as the open half of "MERGE with mixed arm kinds":
-- the or-fact type and its consumer had existed since the generated-CASE arm
-- exclusion landed, and nothing produced one from MERGE arms.
--
-- It is a DISJUNCTION, and the strength is exactly that. `s.sku` is declared
-- by the catalog and needs no help; `t.id` comes from the target key. What the
-- disjunction adds is the one column no other route reaches — and it would add
-- nothing if either arm dropped its condition, since an arm that fires on its
-- match kind alone contributes TRUE.
--
-- The sibling `merge-arm-condition-uncondition.sql` is that statement, one
-- clause apart, and its verdict for the same column is the opposite.
--
-- @planner-keeps 1: EXPLAIN plans MERGE's matching as an outer join, and it
--   is no JoinExpr, so the join audit has no record of it — the arm-condition
--   reading lives on the scope, not on a join.
MERGE INTO tags t
USING products s
ON t.id = s.id
WHEN MATCHED AND s.category_id > 0 THEN
  UPDATE SET name = s.sku
WHEN NOT MATCHED AND s.category_id < 1000 THEN
  INSERT (id, name) VALUES (s.id, s.sku)
RETURNING
  t.id           AS tag_id,      -- @notNull
  s.sku          AS source_sku,  -- @notNull
  s.category_id  AS source_cat   -- @notNull
