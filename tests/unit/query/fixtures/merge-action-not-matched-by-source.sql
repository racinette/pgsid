-- `merge_action()` names the arm on the very arm where the SOURCE vanishes.
--
-- `WHEN NOT MATCHED BY SOURCE` fires for a target row with no source match, so
-- RETURNING reports NULL for every source column — and `merge_action()` is
-- non-null on that same row, because it names the arm a returned row came
-- from and every returned row came from one.
--
-- That combination is the point: a notNull claim and NULL source columns in
-- one row. `merge-returning.sql` covers the source going NULL, and
-- `param-merge.sql` covers `merge_action()`, but no statement put the two on
-- the same arm — so the claim that survives exactly where the row is most
-- degenerate had nothing pinning it.
--
-- The source columns are one extension unit, hence the group. All three arms
-- are present so BOTH arms of that group are observed — the BY SOURCE arm
-- gives the absent one (dense's orphan tag 99), the other two the present one.
--
-- Kept from the fourth sweep's section-F probes, which found no defect: there
-- is no shape in which a MERGE emits a row no arm produced.
-- @null-group 2*,3*
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
  merge_action()  AS act,        -- @notNull
  t.id            AS tag_id,     -- @notNull
  s.id            AS source_id,  -- @nullable
  s.sku           AS source_sku  -- @nullable
