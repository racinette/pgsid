-- The twin of `merge-action-not-matched-by-source.sql`, ONE TOKEN APART, with
-- the opposite verdict on the two source columns.
--
-- That file's BY SOURCE arm is `UPDATE SET name = 'orphan'`, which returns the
-- orphan target row with every source column NULL — so `source_id` and
-- `source_sku` are honestly nullable there and the dense state's tag 99
-- witnesses both. Here the same arm does NOTHING, so the orphan row is
-- visited and never returned, and the only rows that come back are the ones
-- the MATCHED and NOT MATCHED arms produced — every one of which has a source.
--
-- `buildMergeScope` decided this on `matchKind` alone until 2026-08-23, so the
-- mere PRESENCE of a BY SOURCE arm made the source OPTIONAL and nulled two
-- columns the catalog declares NOT NULL. The register carried it as "per-arm
-- reasoning judged not worth it"; the written-value map twenty lines below had
-- been filtering `CMD_NOTHING` correctly the whole time.
--
-- No `@null-group` here, and the absence is the assertion: the sibling emits
-- one over the source columns because they null together, and a source that
-- cannot be absent has no group to offer.
-- @planner-keeps 1: EXPLAIN plans MERGE's matching as an outer join; it is no
--   JoinExpr, so the join audit has no record — the arm-kind reading lives on
--   the scope.
MERGE INTO tags t
USING (SELECT p.id AS id, p.sku AS sku FROM products p) s
ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET name = s.sku
WHEN NOT MATCHED THEN
  INSERT (id, name) VALUES (s.id, s.sku)
WHEN NOT MATCHED BY SOURCE THEN
  DO NOTHING
RETURNING
  t.id  AS tag_id,     -- @notNull
  s.id  AS source_id,  -- @notNull  the dead arm returns no source-less row
  s.sku AS source_sku  -- @notNull
