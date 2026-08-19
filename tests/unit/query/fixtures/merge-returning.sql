-- MERGE ... RETURNING produces output columns like any other DML, and the
-- source relation is optional.
--
-- The target is the row actually written, so it keeps the catalog's
-- nullability. But `WHEN NOT MATCHED BY SOURCE` fires for target rows with no
-- source match, and RETURNING then reports NULL for every source column —
-- including a primary key and a NOT NULL column. Treating the source as
-- required would be unsound.
--
-- And those source columns go NULL *together*: the source is one extension
-- unit, so its bare RETURNING columns form a presence group (dense's
-- orphan tag 99 witnesses the absent arm).
-- @null-group 2*,3*
-- @planner-keeps 1: EXPLAIN plans MERGE's target/source matching as an
--   outer join; it is no JoinExpr, so the join audit has no record — the
--   walk carries the source's optionality (the BY SOURCE arm) on the scope
--   itself.
MERGE INTO tags t
USING (SELECT p.id AS id, p.sku AS sku FROM products p) s
ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET name = s.sku
WHEN NOT MATCHED THEN
  INSERT (id, name) VALUES (s.id, s.sku)
WHEN NOT MATCHED BY SOURCE THEN
  UPDATE SET name = 'orphan'
RETURNING
  t.id                        AS tag_id,        -- @notNull
  t.name                      AS tag_name,      -- @notNull
  s.id                        AS source_id,     -- @nullable
  s.sku                       AS source_sku,    -- @nullable
  COALESCE(s.sku, 'none')     AS safe_source    -- @notNull
