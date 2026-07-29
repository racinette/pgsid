-- Expression node combinations: RowExpr in CoalesceExpr in CaseExpr,
-- A_ArrayExpr as function arg, MinMaxExpr with subquery, CollateClause
-- on cast of COALESCE, NamedArgExpr with nested function calls.
SELECT
  CASE
    WHEN p.deleted_at IS NOT NULL THEN ROW(p.id, 'archived')
    ELSE COALESCE(ROW(p.id, p.name), ROW(0, 'unknown'))
  END AS row_case,                                 -- @notNull
  array_length(ARRAY[p.id, p.id], 1) AS arr_len,  -- @nullable
  GREATEST(
    (SELECT max(rating) FROM reviews WHERE product_id = p.id),
    0
  ) AS greatest_rating,                            -- @notNull
  COALESCE(p.name, 'none')::text COLLATE "C" AS collated,  -- @notNull
  concat_val(b => lower_strict(p.name), a => p.sku) AS named  -- @notNull
FROM products p
