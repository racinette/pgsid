-- @unwitnessable 0: both element skus are non-null literals; the field
--   nullability is forced by the composite expansion (a NULL element nulls
--   every field), which this data never exercises for sku
-- `unnest` of a COMPOSITE-element array expands the element's FIELDS
-- (adversarial-2 finding 4): one column per field, named by the field, all
-- nullable — not one column per argument. The engine once emitted
-- ["unnest", "ordinality"], landing ordinality's notNull on PostgreSQL's
-- qty, which the second element makes NULL; the RangeFunction arm now
-- reads the element type from the ARRAY constructor's casts
-- (unnestCompositeElementFields) and contributes sku and qty. The same
-- divergence was measured through a CTE re-export, a qualified star, ROWS
-- FROM, and as a MERGE source (unnest-composite-merge-source.sql).
SELECT *
FROM unnest(ARRAY[ROW('s1', 1)::sku_pair, ROW('s2', NULL)::sku_pair]) WITH ORDINALITY
-- @nullable   (sku: composite fields carry no constraints)
-- @nullable   (qty: witnessed by the second element's NULL)
-- @notNull    (ordinality: the generated counter)
